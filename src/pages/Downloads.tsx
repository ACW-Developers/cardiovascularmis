import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  Download, 
  Search, 
  FileText, 
  Table as TableIcon, 
  Trash2, 
  Eye,
  Clock,
  FileSpreadsheet,
  BarChart3,
  Filter
} from 'lucide-react';

interface DownloadRecord {
  id: string;
  user_id: string;
  document_type: string;
  document_name: string;
  file_format: string;
  file_size_bytes: number | null;
  metadata: Record<string, any>;
  downloaded_at: string;
}

const documentTypeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  patient_report: { label: 'Patient Report', icon: FileText, color: 'bg-blue-500' },
  excel_export: { label: 'Excel Export', icon: FileSpreadsheet, color: 'bg-emerald-500' },
  research_report: { label: 'Research Report', icon: BarChart3, color: 'bg-purple-500' },
  discharge_summary: { label: 'Discharge Summary', icon: FileText, color: 'bg-orange-500' },
  lab_report: { label: 'Lab Report', icon: FileText, color: 'bg-amber-500' },
  vitals_report: { label: 'Vitals Report', icon: FileText, color: 'bg-pink-500' },
  surgery_report: { label: 'Surgery Report', icon: FileText, color: 'bg-red-500' },
  prescription: { label: 'Prescription', icon: FileText, color: 'bg-cyan-500' },
  other: { label: 'Other Document', icon: FileText, color: 'bg-gray-500' },
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Downloads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [selectedDownload, setSelectedDownload] = useState<DownloadRecord | null>(null);

  const { data: downloads, isLoading } = useQuery({
    queryKey: ['downloads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('downloads')
        .select('*')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false });
      if (error) throw error;
      return data as DownloadRecord[];
    },
    enabled: !!user?.id,
  });

  const deleteDownloadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('downloads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      toast.success('Download record removed');
    },
    onError: () => {
      toast.error('Failed to remove download record');
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase.from('downloads').delete().eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      toast.success('Download history cleared');
    },
    onError: () => {
      toast.error('Failed to clear download history');
    },
  });

  const filteredDownloads = downloads?.filter((dl) => {
    const matchesSearch = dl.document_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || dl.document_type === typeFilter;
    const matchesFormat = formatFilter === 'all' || dl.file_format === formatFilter;
    return matchesSearch && matchesType && matchesFormat;
  });

  const stats = {
    total: downloads?.length || 0,
    thisWeek: downloads?.filter(dl => {
      const downloadDate = new Date(dl.downloaded_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return downloadDate >= weekAgo;
    }).length || 0,
    pdfCount: downloads?.filter(dl => dl.file_format === 'pdf').length || 0,
    excelCount: downloads?.filter(dl => dl.file_format === 'xlsx').length || 0,
  };

  const getDocumentTypeInfo = (type: string) => {
    return documentTypeLabels[type] || documentTypeLabels.other;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title text-xl sm:text-2xl lg:text-3xl">Downloads</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            View and manage your download history
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {format(new Date(), 'PPP')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Clock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.thisWeek}</p>
                <p className="text-xs text-muted-foreground">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <FileText className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pdfCount}</p>
                <p className="text-xs text-muted-foreground">PDF Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.excelCount}</p>
                <p className="text-xs text-muted-foreground">Excel Exports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search downloads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(documentTypeLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {downloads && downloads.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Download History</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove all download records. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
                      onClick={() => clearAllMutation.mutate()}
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading downloads...</div>
          ) : filteredDownloads?.length === 0 ? (
            <div className="text-center py-12">
              <Download className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No downloads yet</p>
              <p className="text-muted-foreground">Your download history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Downloaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDownloads?.map((dl) => {
                    const typeInfo = getDocumentTypeInfo(dl.document_type);
                    const IconComponent = typeInfo.icon;
                    return (
                      <TableRow key={dl.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${typeInfo.color}/10`}>
                              <IconComponent className={`w-4 h-4 ${typeInfo.color.replace('bg-', 'text-')}`} />
                            </div>
                            <span className="font-medium truncate max-w-[200px]">{dl.document_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{typeInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={dl.file_format === 'pdf' ? 'bg-red-500' : 'bg-emerald-500'}>
                            {dl.file_format.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatFileSize(dl.file_size_bytes)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(dl.downloaded_at), 'PPp')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDownload(dl)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Download Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove "{dl.document_name}" from your download history?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground"
                                    onClick={() => deleteDownloadMutation.mutate(dl.id)}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Preview Dialog */}
      <Dialog open={!!selectedDownload} onOpenChange={() => setSelectedDownload(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Download Details</DialogTitle>
          </DialogHeader>
          {selectedDownload && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                {(() => {
                  const typeInfo = getDocumentTypeInfo(selectedDownload.document_type);
                  const IconComponent = typeInfo.icon;
                  return (
                    <div className={`p-3 rounded-lg ${typeInfo.color}/10`}>
                      <IconComponent className={`w-6 h-6 ${typeInfo.color.replace('bg-', 'text-')}`} />
                    </div>
                  );
                })()}
                <div>
                  <p className="font-medium">{selectedDownload.document_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getDocumentTypeInfo(selectedDownload.document_type).label}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="font-medium">{selectedDownload.file_format.toUpperCase()}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="font-medium">{formatFileSize(selectedDownload.file_size_bytes)}</p>
                </div>
                <div className="col-span-2 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Downloaded At</p>
                  <p className="font-medium">{format(new Date(selectedDownload.downloaded_at), 'PPpp')}</p>
                </div>
              </div>

              {selectedDownload.metadata && Object.keys(selectedDownload.metadata).length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Additional Information</p>
                  <div className="text-sm space-y-1">
                    {Object.entries(selectedDownload.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
