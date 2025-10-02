interface ActiveCampaignContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  fieldValues?: Array<{
    field: string;
    value: string;
  }>;
}

interface ActiveCampaignResponse {
  contact?: {
    id: string;
    email: string;
  };
  contacts?: Array<{
    id: string;
    email: string;
  }>;
  tags?: Array<{
    id: string;
    tag: string;
  }>;
  tag?: {
    id: string;
    tag: string;
  };
}

class ActiveCampaignService {
  private apiUrl: string;
  private apiKey: string;
  private listId: string;
  public isConfigured: boolean = false;

  constructor() {
    // Check if ActiveCampaign is configured
    this.isConfigured = !!(process.env.ACTIVECAMPAIGN_API_URL && 
                          process.env.ACTIVECAMPAIGN_API_KEY && 
                          process.env.ACTIVECAMPAIGN_LIST_ID);
    
    if (!this.isConfigured) {
      console.log('ActiveCampaign not configured - skipping integration');
      return;
    }

    this.apiUrl = process.env.ACTIVECAMPAIGN_API_URL;
    this.apiKey = process.env.ACTIVECAMPAIGN_API_KEY;
    
    // Extract list ID from URL if it's a full URL
    const listIdEnv = process.env.ACTIVECAMPAIGN_LIST_ID;
    if (listIdEnv.includes('listid=')) {
      // Extract numeric ID from URL like "https://kgprofessional.activehosted.com/app/contacts?listid=15&status=1"
      const match = listIdEnv.match(/listid=(\d+)/);
      this.listId = match ? match[1] : listIdEnv;
    } else {
      this.listId = listIdEnv;
    }
    
    console.log(`ActiveCampaign initialized with list ID: ${this.listId}`);
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const url = `${this.apiUrl}/api/3/${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Api-Token': this.apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    // Log important requests for debugging
    if (method === 'POST') {
      console.log(`ActiveCampaign ${method} request to: ${url}`);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ActiveCampaign API Error: ${response.status} - ${errorText}`);
        console.error(`Failed request URL: ${url}`);
        console.error(`Failed request method: ${method}`);
        if (data) {
          console.error(`Failed request payload:`, JSON.stringify(data, null, 2));
        }
        throw new Error(`ActiveCampaign API request failed: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('ActiveCampaign API Error:', error);
      throw error;
    }
  }

  async addContact(contactData: ActiveCampaignContact): Promise<string | null> {
    if (!this.isConfigured) {
      console.log('ActiveCampaign not configured - skipping contact addition');
      return null;
    }
    try {
      // First, check if contact already exists
      const existingContact = await this.findContactByEmail(contactData.email);
      
      if (existingContact) {
        console.log(`Contact already exists in ActiveCampaign: ${contactData.email} (ID: ${existingContact})`);
        await this.addContactToList(existingContact, this.listId);
        
        // Apply the salonsuccessmanager tag to existing contact
        await this.applyTagToContact(existingContact, 'salonsuccessmanager');
        
        return existingContact;
      }

      // Create new contact with list subscription
      console.log(`Creating new contact for: ${contactData.email}`);
      const contactPayload = {
        contact: {
          email: contactData.email,
          firstName: contactData.firstName || '',
          lastName: contactData.lastName || '',
          phone: contactData.phone || '',
          fieldValues: contactData.fieldValues || [],
          p: [this.listId] // Subscribe to list during creation
        }
      };

      const response: ActiveCampaignResponse = await this.makeRequest('contacts', 'POST', contactPayload);
      
      if (response.contact?.id) {
        console.log(`Contact created in ActiveCampaign: ${contactData.email} (ID: ${response.contact.id})`);
        
        // Apply the salonsuccessmanager tag
        await this.applyTagToContact(response.contact.id, 'salonsuccessmanager');
        
        // Note: List assignment handled manually in ActiveCampaign
        console.log(`Contact ready for list assignment: https://kgprofessional.activehosted.com/app/contacts/view/${response.contact.id}`);
        
        return response.contact.id;
      }

      return null;
    } catch (error) {
      console.error('Error adding contact to ActiveCampaign:', error);
      return null;
    }
  }

  private async findContactByEmail(email: string): Promise<string | null> {
    try {
      const response: ActiveCampaignResponse = await this.makeRequest(`contacts?email=${encodeURIComponent(email)}`);
      
      if (response.contacts && response.contacts.length > 0) {
        return response.contacts[0].id;
      }
      
      return null;
    } catch (error) {
      console.error('Error finding contact by email:', error);
      return null;
    }
  }

  private async addContactToList(contactId: string, listId: string): Promise<void> {
    const subscriptionPayload = {
      contactList: {
        list: listId,
        contact: contactId,
        status: 1
      }
    };

    try {
      // Add a small delay to ensure contact is fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await this.makeRequest('contactLists', 'POST', subscriptionPayload);
      console.log(`Contact ${contactId} successfully added to list ${listId}`);
      return;
    } catch (error) {
      console.error(`Failed to add contact ${contactId} to list ${listId}:`, error);
      // Try one more time after delay
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await this.makeRequest('contactLists', 'POST', subscriptionPayload);
        console.log(`Contact ${contactId} added to list ${listId} on retry`);
      } catch (retryError) {
        console.error(`Retry failed for contact ${contactId}:`, retryError);
        // Don't throw - contact creation is more important
      }
    }
  }

  private async findOrCreateTag(tagName: string): Promise<string | null> {
    try {
      // First, try to find existing tag
      const response: ActiveCampaignResponse = await this.makeRequest(`tags?search=${encodeURIComponent(tagName)}`);
      
      if (response.tags && response.tags.length > 0) {
        // Check if we have an exact match
        const exactMatch = response.tags.find(tag => tag.tag.toLowerCase() === tagName.toLowerCase());
        if (exactMatch) {
          console.log(`Tag found: ${tagName} (ID: ${exactMatch.id})`);
          return exactMatch.id;
        }
      }

      // Tag doesn't exist, create it
      const tagPayload = {
        tag: {
          tag: tagName,
          tagType: 'contact',
          description: `Auto-created tag for ${tagName}`
        }
      };

      const createResponse: ActiveCampaignResponse = await this.makeRequest('tags', 'POST', tagPayload);
      
      if (createResponse.tag?.id) {
        console.log(`Tag created: ${tagName} (ID: ${createResponse.tag.id})`);
        return createResponse.tag.id;
      }

      return null;
    } catch (error) {
      console.error(`Error finding/creating tag ${tagName}:`, error);
      return null;
    }
  }

  private async applyTagToContact(contactId: string, tagName: string): Promise<void> {
    try {
      const tagId = await this.findOrCreateTag(tagName);
      
      if (!tagId) {
        console.error(`Failed to find or create tag: ${tagName}`);
        return;
      }

      const contactTagPayload = {
        contactTag: {
          contact: contactId,
          tag: tagId
        }
      };

      await this.makeRequest('contactTags', 'POST', contactTagPayload);
      console.log(`Tag ${tagName} applied to contact ${contactId}`);
    } catch (error) {
      console.error(`Error applying tag ${tagName} to contact ${contactId}:`, error);
      // Don't throw - contact creation is more important than tagging
    }
  }

  async sendNotificationEmail(userEmail: string, userName: string, businessType: string, hasPromoCode: boolean): Promise<void> {
    if (!this.isConfigured) {
      console.log('ActiveCampaign not configured - skipping notification email');
      return;
    }
    try {
      // Add custom fields for business tracking
      const fieldValues = [
        {
          field: 'businessType',
          value: businessType
        },
        {
          field: 'signupDate',
          value: new Date().toISOString()
        },
        {
          field: 'hasPromoCode',
          value: hasPromoCode ? 'Yes' : 'No'
        }
      ];

      const contactId = await this.addContact({
        email: userEmail,
        firstName: userName.split(' ')[0] || '',
        lastName: userName.split(' ').slice(1).join(' ') || '',
        fieldValues
      });

      console.log(`Signup notification processed for: ${userEmail}`);
      if (contactId) {
        console.log(`Contact ID: ${contactId}`);
      }
    } catch (error) {
      console.error('Error sending notification email:', error);
    }
  }
}

export const activeCampaign = new ActiveCampaignService();