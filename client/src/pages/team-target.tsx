
import Header from "@/components/header";

import { useCurrency } from "@/contexts/CurrencyContext";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Trash2, Plus, TrendingUp, Target, Award, Edit } from "lucide-react";

// Mock subscription check - in real app this would check user's subscription status
const hasActiveSubscription = false;

interface TeamMember {
  id: number;
  userId: number;
  staffName: string;
  role: string | null;
  monthlySalary: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function TeamTarget() {
  const { formatCurrency, formatSymbol } = useCurrency();
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState("");
  const [role, setRole] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch team members on mount
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-targets', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data);
      } else if (response.status === 401) {
        toast({
          title: "Session Expired",
          description: "Please log in to continue",
          variant: "destructive",
        });
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTeamMember = (member: TeamMember) => {
  setEditingId(member.id);
  setStaffName(member.staffName);
  setRole(member.role || "");
  setMonthlySalary(member.monthlySalary);
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

  const handleAddTeamMember = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!staffName.trim() || !monthlySalary.trim()) {
    toast({
      title: "Validation Error",
      description: "Please fill in staff name and monthly salary",
      variant: "destructive",
    });
    return;
  }

  setSubmitting(true);
  try {
    const body = {
      staffName: staffName.trim(),
      role: role.trim() || null,
      monthlySalary: monthlySalary,
    };

    // If editing, use PUT; otherwise use POST
    const url = editingId ? `/api/team-targets/${editingId}` : '/api/team-targets';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const updatedMember = await response.json();
      
      if (editingId) {
        // Update existing member
        setTeamMembers(teamMembers.map(m => 
          m.id === editingId ? updatedMember : m
        ));
        toast({
          title: "Success",
          description: "Team member updated successfully",
        });
      } else {
        // Add new member
        setTeamMembers([...teamMembers, updatedMember]);
        toast({
          title: "Success",
          description: "Team member added successfully",
        });
      }
      
      // Reset form
      setStaffName("");
      setRole("");
      setMonthlySalary("");
      setEditingId(null);
    } else {
      throw new Error('Failed to save team member');
    }
  } catch (error) {
    console.error('Error saving team member:', error);
    toast({
      title: "Error",
      description: "Failed to save team member",
      variant: "destructive",
    });
  } finally {
    setSubmitting(false);
  }
};

  const handleDeleteTeamMember = async (id: number) => {
    try {
      const response = await fetch(`/api/team-targets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setTeamMembers(teamMembers.filter(member => member.id !== id));
        toast({
          title: "Success",
          description: "Team member deleted successfully",
        });
      } else {
        throw new Error('Failed to delete team member');
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast({
        title: "Error",
        description: "Failed to delete team member",
        variant: "destructive",
      });
    }
  };

  const calculate2xTarget = (salary: string) => {
    return (parseFloat(salary) * 2).toFixed(2);
  };

  const calculate3xTarget = (salary: string) => {
    return (parseFloat(salary) * 3).toFixed(2);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Team Targets" 
        description="Calculate and track salary multiplier targets for your team. Industry standard: 3x salary." 
      />

      {/* Add Team Member Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 m-8">
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Team Member
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Add staff members to track if they're hitting revenue targets
        </p>

        <form onSubmit={handleAddTeamMember}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Staff Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g., Sarah Johnson"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Role (Optional)
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Senior Stylist"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Monthly Salary <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="e.g., 3000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white hover-bg-[#FFB6C1] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Plus className="w-4 h-4" />
                {submitting ? "Saving..." : (editingId ? "Update Team Member" : "Add Team Member")}
            </button>
            
            {editingId && (
                <button
                type="button"
                onClick={() => {
                    setEditingId(null);
                    setStaffName("");
                    setRole("");
                    setMonthlySalary("");
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                Cancel
                </button>
            )}
            </div>
        </form>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mx-8">
        {teamMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-lg border border-gray-200 p-6">
            {/* Header with name and delete button */}
            <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="text-xl font-bold">{member.staffName}</h3>
                <p className="text-sm text-gray-600">{member.role || 'employee'}</p>
            </div>
            <div className="flex gap-2">
                <button
                onClick={() => handleEditTeamMember(member)}
                className="text-blue-500 hover:text-blue-700 p-1"
                title="Edit team member"
                >
                <Edit className="w-5 h-5" />
                </button>
                <button
                onClick={() => handleDeleteTeamMember(member.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Delete team member"
                >
                <Trash2 className="w-5 h-5" />
                </button>
            </div>
            </div>

            {/* Current Salary */}
            <div className="bg-pink-50 rounded-lg p-4 mb-3">
              <p className="text-sm text-gray-600 mb-1">Current Monthly Salary</p>
              <p className="text-2xl font-bold">
                {formatSymbol()}{parseFloat(member.monthlySalary).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* 2x Target */}
            <div className="bg-blue-50 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-600">2x Target</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {formatSymbol()}{parseFloat(calculate2xTarget(member.monthlySalary)).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-blue-600 mt-1">Minimum monthly revenue</p>
            </div>

            {/* 3x Target */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                  3x Target <Award className="w-4 h-4 text-yellow-500" />
                </p>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatSymbol()}{parseFloat(calculate3xTarget(member.monthlySalary)).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-green-600 mt-1">Industry standard goal</p>
            </div>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mx-8 mb-8">
        <div className="flex items-start gap-3">
          <Target className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold mb-3">Understanding Revenue Targets</h3>
            <div className="space-y-2 text-sm">
              <p>
                <strong className="text-blue-900">2x Target:</strong>{" "}
                <span className="text-gray-700">Minimum revenue to cover salary and basic costs</span>
              </p>
              <p>
                <strong className="text-blue-900">3x Target:</strong>{" "}
                <span className="text-gray-700">Industry standard for profitable staff performance</span>
              </p>
              <p className="flex items-start gap-2 text-gray-700">
                <Award className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Tip:</strong> If a team member consistently hits their 3x target, they're contributing significantly to business growth!
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {teamMembers.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No team members yet</h3>
          <p className="text-gray-500">Add your first team member to start tracking revenue targets</p>
        </div>
      )}

      
    </>
  );
}