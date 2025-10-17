import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2, Trash2, Palette } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { insertMoneyPotSchema } from "@shared/schema";
import type { MoneyPot } from "@shared/schema";

const moneyPotFormSchema = insertMoneyPotSchema
  .omit({ userId: true })
  .extend({
    percentage: z.string().min(1, "Percentage is required")
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0 && num <= 100;
      }, "Percentage must be between 0.01 and 100")
  });

type MoneyPotFormData = z.infer<typeof moneyPotFormSchema>;

const colorOptions = [
  { value: "#3b82f6", label: "Blue", color: "#3b82f6" },
  { value: "#ef4444", label: "Red", color: "#ef4444" },
  { value: "#10b981", label: "Green", color: "#10b981" },
  { value: "#f59e0b", label: "Orange", color: "#f59e0b" },
  { value: "#8b5cf6", label: "Purple", color: "#8b5cf6" },
  { value: "#06b6d4", label: "Cyan", color: "#06b6d4" },
  { value: "#84cc16", label: "Lime", color: "#84cc16" },
  { value: "#f97316", label: "Orange", color: "#f97316" },
];

export default function MoneyPots() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPot, setEditingPot] = useState<MoneyPot | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for session cookie and handle API 401 responses
    useEffect(() => {
      console.log('🔍 Dashboard mounted - checking authentication...');
      
      const checkSession = async () => {
        try {
          // Make an API call to verify session is valid
          const response = await fetch('/api/v2/auth/user', {
            method: 'GET',
            credentials: 'include',
          });
          
          console.log('🔍 Auth check response status:', response.status);
          if (response.status === 401) {
            console.log('❌ Session invalid or expired - redirecting to login');
  
            toast({
              title: "Session Expired",
              description: "Please log in to continue",
              variant: "destructive",
            });
            
            // Wait 2 seconds before redirecting so toast is visible
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
            
          } else if (response.ok) {
            const data = await response.json();
            console.log('✅ Session valid for user:', data.email);
          }
        } catch (error) {
          console.error('❌ Error checking session:', error);
        }
      };
  
      // Check immediately on mount
      checkSession();
      
      // Set up periodic check every 30 seconds
      const intervalId = setInterval(checkSession, 30000);
      
      return () => clearInterval(intervalId);
    }, [toast]);

  const { data: moneyPots = [] } = useQuery({
    queryKey: ["/api/money-pots"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: MoneyPotFormData) => {
      const response = await fetch("/api/money-pots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create money pot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/money-pots"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Money pot created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create money pot",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MoneyPotFormData }) => {
      const response = await fetch(`/api/money-pots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update money pot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/money-pots"] });
      setEditingPot(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Money pot updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update money pot",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/money-pots/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete money pot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/money-pots"] });
      toast({
        title: "Success",
        description: "Money pot deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete money pot",
        variant: "destructive",
      });
    },
  });

  const form = useForm<MoneyPotFormData>({
    resolver: zodResolver(moneyPotFormSchema),
    defaultValues: {
      name: "",
      percentage: "",
      color: "#3b82f6",
      sortOrder: 0,
    },
    mode: "onChange",
  });

  const editForm = useForm<MoneyPotFormData>({
    resolver: zodResolver(moneyPotFormSchema),
  });

  const onSubmit = (data: MoneyPotFormData) => {
    createMutation.mutate(data);
  };

  const onEdit = (pot: MoneyPot) => {
    setEditingPot(pot);
    editForm.reset({
      name: pot.name,
      percentage: pot.percentage.toString(),
      color: pot.color || "#3b82f6",
      sortOrder: pot.sortOrder || 0,
    });
  };

  const onUpdate = (data: MoneyPotFormData) => {
    if (editingPot) {
      updateMutation.mutate({ id: editingPot.id, data });
    }
  };

  const totalPercentage = (moneyPots as MoneyPot[]).reduce((sum: number, pot: MoneyPot) => sum + parseFloat(pot.percentage.toString()), 0);

  return (
    <div className="container mx-auto p-6 lg:mt-[0px] mt-[75px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Money Pots</h1>
          <p className="text-muted-foreground mt-2">
            Create custom categories to allocate your income. Set percentages for VAT, profit, expenses, and more.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-white">
              <Plus className="w-4 h-4 mr-2 text-white" />
              Add Money Pot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Money Pot</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., VAT, Profit, Equipment Fund" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          placeholder="20.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full" 
                                  style={{ backgroundColor: color.color }}
                                />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {totalPercentage > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Allocation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-2">
              <span>Total Allocated:</span>
              <Badge variant={totalPercentage > 100 ? "destructive" : "default"} className="text-white">
                {totalPercentage.toFixed(2)}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${totalPercentage > 100 ? 'bg-red-600' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>
            {totalPercentage > 100 && (
              <p className="text-red-600 text-sm mt-2">
                Warning: Total allocation exceeds 100%
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(moneyPots as MoneyPot[]).map((pot: MoneyPot) => (
          <Card key={pot.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: pot.color || "#3b82f6" }}
                  />
                  <CardTitle className="text-lg">{pot.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(pot)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(pot.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold">{pot.percentage}%</div>
                <p className="text-muted-foreground text-sm">of income</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingPot && (
        <Dialog open={!!editingPot} onOpenChange={(open) => !open && setEditingPot(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Money Pot</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onUpdate)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., VAT, Profit, Equipment Fund" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          placeholder="20.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "#3b82f6"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full" 
                                  style={{ backgroundColor: color.color }}
                                />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditingPot(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}