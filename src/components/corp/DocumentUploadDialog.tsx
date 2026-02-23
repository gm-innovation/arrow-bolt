import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { useCorpDocuments } from '@/hooks/useCorpDocuments';
import { useDepartments } from '@/hooks/useDepartments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DocumentUploadDialogProps {
  companyId: string;
  targetUserId?: string;
  mode?: 'self' | 'hr';
}

const sanitizeFileName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

const docTypeLabels: Record<string, string> = {
  payslip: 'Holerite',
  benefits: 'Benefícios',
  declaration: 'Declaração',
  institutional: 'Institucional',
  medical_certificate: 'Atestado Médico',
  reimbursement_proof: 'Comprovante de Reembolso',
  signed_form: 'Formulário Assinado',
  other: 'Outro',
};

const hrTypes = ['payslip', 'benefits', 'declaration', 'institutional'];
const userTypes = ['medical_certificate', 'reimbursement_proof', 'signed_form', 'other'];

const DocumentUploadDialog = ({ companyId, targetUserId, mode = 'self' }: DocumentUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [departmentId, setDepartmentId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { uploadDocument } = useCorpDocuments();
  const { departments } = useDepartments();

  const availableTypes = mode === 'hr' ? hrTypes : userTypes;

  const handleUpload = async () => {
    if (!file || !title || !docType || !user) return;
    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name);
      const path = `${companyId}/${targetUserId || user.id}/${Date.now()}_${safeName}`;
      const { error: storageError } = await supabase.storage.from('corp-documents').upload(path, file);
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('corp-documents').getPublicUrl(path);

      uploadDocument.mutate({
        company_id: companyId,
        owner_user_id: targetUserId || user.id,
        document_type: docType,
        title,
        file_name: file.name,
        file_url: urlData.publicUrl,
        visibility_level: visibility,
        ...(departmentId ? { department_id: departmentId } : {}),
      }, {
        onSuccess: () => {
          setOpen(false);
          setTitle('');
          setDocType('');
          setDepartmentId('');
          setFile(null);
        }
      });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Upload className="h-4 w-4" /> {mode === 'hr' ? 'Enviar p/ Colaborador' : 'Enviar Documento'}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'hr' ? 'Enviar Documento para Colaborador' : 'Enviar Documento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Holerite Janeiro 2026" />
          </div>
          <div>
            <Label>Tipo de Documento *</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {availableTypes.map(t => (
                  <SelectItem key={t} value={t}>{docTypeLabels[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Departamento (opcional)</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
              <SelectContent>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visibilidade</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Privado</SelectItem>
                <SelectItem value="department">Departamento</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arquivo *</Label>
            <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!file || !title || !docType || uploading}>
              {uploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUploadDialog;
