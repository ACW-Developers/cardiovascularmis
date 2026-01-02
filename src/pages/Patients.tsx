import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Patient } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Search, Plus, Eye, Activity, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Patients() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: async () => {
      let query = supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,patient_number.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Patient[];
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-success/10 text-success',
      inactive: 'bg-muted text-muted-foreground',
      discharged: 'bg-info/10 text-info',
    };
    return (
      <Badge className={variants[status] || variants.active}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Patient Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all registered patients
          </p>
        </div>
        {role && ['admin', 'nurse'].includes(role) && (
          <Button onClick={() => navigate('/patients/register')} className="gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Register Patient
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or patient number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Registered Patients ({patients?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-header">Patient #</TableHead>
                <TableHead className="table-header">Name</TableHead>
                <TableHead className="table-header">Age/Gender</TableHead>
                <TableHead className="table-header">Contact</TableHead>
                <TableHead className="table-header">Blood Type</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading patients...
                  </TableCell>
                </TableRow>
              ) : patients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No patients found
                  </TableCell>
                </TableRow>
              ) : (
                patients?.map((patient) => {
                  const age = Math.floor(
                    (new Date().getTime() - new Date(patient.date_of_birth).getTime()) / 
                    (365.25 * 24 * 60 * 60 * 1000)
                  );
                  return (
                    <TableRow key={patient.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{patient.patient_number}</TableCell>
                      <TableCell className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </TableCell>
                      <TableCell>
                        {age} yrs / {patient.gender}
                      </TableCell>
                      <TableCell>{patient.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{patient.blood_type || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(patient.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {role && ['admin', 'nurse'].includes(role) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/vitals?patient=${patient.id}`)}
                            >
                              <Activity className="w-4 h-4" />
                            </Button>
                          )}
                          {role && ['admin', 'nurse', 'doctor'].includes(role) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/appointments?patient=${patient.id}`)}
                            >
                              <Calendar className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Patient Detail Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Patient Details
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient Number</p>
                  <p className="font-mono font-medium">{selectedPatient.patient_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPatient.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p>{format(new Date(selectedPatient.date_of_birth), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p>{selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blood Type</p>
                  <p>{selectedPatient.blood_type || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{selectedPatient.email || 'Not specified'}</p>
                </div>
              </div>

              {selectedPatient.cardiovascular_history && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cardiovascular History</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedPatient.cardiovascular_history}</p>
                </div>
              )}

              {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Allergies</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPatient.allergies.map((allergy, i) => (
                      <Badge key={i} variant="destructive">{allergy}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Treatment Consent</p>
                  <Badge variant={selectedPatient.consent_treatment ? 'default' : 'secondary'}>
                    {selectedPatient.consent_treatment ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Biological Sample Consent</p>
                  <Badge variant={selectedPatient.consent_biological_samples ? 'default' : 'secondary'}>
                    {selectedPatient.consent_biological_samples ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
