import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Download, Eye, ExternalLink, FileImage, FileText, Link2, Plus, Trash2, Upload, X } from 'lucide-react';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PlayerUnavailabilityAttachment } from '@/domain/entities/availability/PlayerUnavailabilityAttachment';
import {
  createAttachmentSignedUrlUseCase,
  deleteUnavailabilityAttachmentUseCase,
  getUnavailabilityAttachmentsUseCase,
} from '@/presentation/features/availability/services/availabilityDependencies';

const ALLOWED_FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const SAFE_USER_ERROR_PATTERNS = [
  /titulo\s+es\s+obligatorio/i,
  /url\s+es\s+obligatoria/i,
  /url\s+debe\s+comenzar\s+con\s+http/i,
  /tipo\s+de\s+archivo\s+no\s+permitido/i,
  /archivo\s+supera\s+el\s+limite\s+de\s+50\s*mb/i,
  /no\s+se\s+encontro\s+la\s+referencia\s+del\s+archivo/i,
  /no\s+se\s+pudo\s+eliminar\s+el\s+archivo\s+del\s+almacenamiento/i,
  /no\s+tenes\s+permisos/i,
  /solo\s+un\s+medico/i,
  /lesion\s+ya\s+fue\s+cerrada/i,
  /no\s+se\s+pudo\s+completar\s+la\s+operacion/i,
  /alguna\s+fecha\s+ingresada\s+no\s+es\s+valida/i,
];

export type PendingAttachment =
  | {
      tempId: string;
      type: 'FILE';
      title: string;
      description: string;
      file: File;
    }
  | {
      tempId: string;
      type: 'LINK';
      title: string;
      description: string;
      externalUrl: string;
    };

interface MedicalAttachmentsSectionProps {
  unavailabilityId: string;
  disabled?: boolean;
  pendingAttachments: PendingAttachment[];
  onAddPendingAttachment: (attachment: PendingAttachment) => void;
  onRemovePendingAttachment: (tempId: string) => void;
}

function formatFileSize(sizeBytes: number | null): string {
  if (typeof sizeBytes !== 'number' || Number.isNaN(sizeBytes) || sizeBytes <= 0) {
    return 'Tamano no disponible';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const decimals = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function formatMimeLabel(mimeType: string | null): string {
  if (!mimeType) {
    return 'Archivo';
  }

  if (mimeType === 'application/pdf') {
    return 'PDF';
  }

  if (mimeType.startsWith('image/')) {
    return 'Imagen';
  }

  return 'Archivo';
}

function sanitizeMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    const message = error.message.trim();
    if (SAFE_USER_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      return message;
    }
  }

  return fallback;
}

export function MedicalAttachmentsSection({
  unavailabilityId,
  disabled = false,
  pendingAttachments,
  onAddPendingAttachment,
  onRemovePendingAttachment,
}: MedicalAttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<PlayerUnavailabilityAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [sectionSuccess, setSectionSuccess] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'CHOOSER' | 'LINK' | 'FILE'>('CHOOSER');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const [fileTitle, setFileTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingDismissAction, setPendingDismissAction] = useState<'CLOSE' | 'BACK_TO_CHOOSER' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PlayerUnavailabilityAttachment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [preview, setPreview] = useState<{ title: string; url: string } | null>(null);

  const canMutate = !disabled;

  const sortedAttachments = useMemo(() => {
    return [...attachments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [attachments]);

  const loadAttachments = useCallback(async () => {
    try {
      setLoading(true);
      setSectionError(null);

      const data = await getUnavailabilityAttachmentsUseCase.execute(unavailabilityId);
      setAttachments(data);
    } catch (error) {
      console.error('Error al cargar adjuntos medicos:', error);
      setSectionError('No se pudieron cargar los estudios y archivos.');
    } finally {
      setLoading(false);
    }
  }, [unavailabilityId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAttachments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAttachments]);

  const resetAddForm = useCallback(() => {
    setAddMode('CHOOSER');
    setLinkTitle('');
    setLinkUrl('');
    setLinkDescription('');
    setLinkError(null);
    setFileTitle('');
    setSelectedFile(null);
    setFileDescription('');
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const isAttachmentModalDirty = useMemo(() => {
    const hasLinkDraft =
      linkTitle.trim().length > 0 || linkUrl.trim().length > 0 || linkDescription.trim().length > 0;
    const hasFileDraft =
      fileTitle.trim().length > 0 || fileDescription.trim().length > 0 || selectedFile !== null;

    return hasLinkDraft || hasFileDraft;
  }, [fileDescription, fileTitle, linkDescription, linkTitle, linkUrl, selectedFile]);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const executeDismissAction = useCallback((action: 'CLOSE' | 'BACK_TO_CHOOSER') => {
    if (action === 'CLOSE') {
      setIsAddModalOpen(false);
      resetAddForm();
      return;
    }

    resetAddForm();
  }, [resetAddForm]);

  const requestDismissAction = useCallback((action: 'CLOSE' | 'BACK_TO_CHOOSER') => {
    if (!isAttachmentModalDirty) {
      executeDismissAction(action);
      return;
    }

    setPendingDismissAction(action);
    setDiscardDialogOpen(true);
  }, [executeDismissAction, isAttachmentModalDirty]);

  const closeAddModal = useCallback(() => {
    requestDismissAction('CLOSE');
  }, [requestDismissAction]);

  const openAddModal = () => {
    setSectionError(null);
    setSectionSuccess(null);
    setIsAddModalOpen(true);
    setAddMode('CHOOSER');
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      return 'Tipo de archivo no permitido. Solo PDF, JPG, PNG o WEBP.';
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'El archivo supera el limite de 50 MB.';
    }

    return null;
  };

  const handleSelectFile = (file: File | null) => {
    setFileError(null);
    setSelectedFile(file);

    if (!file) {
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      removeSelectedFile();
    }
  };

  useEffect(() => {
    if (!isAddModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      requestDismissAction('CLOSE');
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isAddModalOpen, requestDismissAction]);

  const handleConfirmLink = () => {
    const title = linkTitle.trim();
    const url = linkUrl.trim();

    if (!title) {
      setLinkError('El titulo es obligatorio.');
      return;
    }

    if (!url) {
      setLinkError('La URL es obligatoria.');
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      setLinkError('La URL debe comenzar con http:// o https://.');
      return;
    }

    setLinkError(null);
    setSectionError(null);
    setSectionSuccess('Adjunto pendiente agregado. Se guardara al confirmar la ficha.');
    onAddPendingAttachment({
      tempId: crypto.randomUUID(),
      type: 'LINK',
      title,
      description: linkDescription.trim(),
      externalUrl: url,
    });
    executeDismissAction('CLOSE');
  };

  const handleConfirmFile = () => {
    const title = fileTitle.trim();

    if (!title) {
      setFileError('El titulo es obligatorio.');
      return;
    }

    if (!selectedFile) {
      setFileError('Debe seleccionar un archivo.');
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setFileError(null);
    setSectionError(null);
    setSectionSuccess('Adjunto pendiente agregado. Se guardara al confirmar la ficha.');
    onAddPendingAttachment({
      tempId: crypto.randomUUID(),
      type: 'FILE',
      title,
      description: fileDescription.trim(),
      file: selectedFile,
    });
    executeDismissAction('CLOSE');
  };

  const openFileSignedUrl = async (
    attachment: PlayerUnavailabilityAttachment,
    mode: 'VIEW' | 'DOWNLOAD'
  ) => {
    if (!attachment.storageBucket || !attachment.storagePath) {
      setSectionError('No se encontro la referencia del archivo.');
      return;
    }

    try {
      setSectionError(null);
      setSectionSuccess(null);

      const signedUrl = await createAttachmentSignedUrlUseCase.execute({
        storageBucket: attachment.storageBucket,
        storagePath: attachment.storagePath,
        expiresInSeconds: 60,
        downloadFilename:
          mode === 'DOWNLOAD' ? attachment.originalFilename ?? `${attachment.title}.bin` : undefined,
      });

      const isImage = IMAGE_MIME_TYPES.has(attachment.mimeType ?? '');

      if (mode === 'VIEW' && isImage) {
        setPreview({ title: attachment.title, url: signedUrl });
        return;
      }

      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error al generar URL firmada:', error);
      setSectionError('No se pudo abrir el archivo en este momento.');
    }
  };

  const handleDeleteAttachment = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      setSectionError(null);
      setSectionSuccess(null);

      await deleteUnavailabilityAttachmentUseCase.execute({
        attachment: deleteTarget,
      });

      setSectionSuccess('Adjunto eliminado correctamente.');
      setDeleteTarget(null);
      await loadAttachments();
    } catch (error) {
      console.error('Error al eliminar adjunto:', error);
      setSectionError(sanitizeMessage(error, 'No se pudo eliminar el adjunto.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Estudios y archivos</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona links y archivos medicos asociados a esta lesion.
          </p>
        </div>

        <Button onClick={openAddModal} disabled={!canMutate || loading}>
          <Plus className="h-4 w-4" />
          Agregar estudio o archivo
        </Button>
      </div>

      {sectionError && (
        <div className="rounded-md border border-destructive/35 bg-destructive/5 p-3 text-sm text-destructive">
          {sectionError}
        </div>
      )}

      {sectionSuccess && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {sectionSuccess}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando adjuntos...</p>
      ) : sortedAttachments.length === 0 && pendingAttachments.length === 0 ? (
        <div className="space-y-3 rounded-md border border-dashed p-4">
          <p className="text-sm text-muted-foreground">No hay estudios o archivos adjuntos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingAttachments.map((attachment) => {
            const isFile = attachment.type === 'FILE';
            const mimeLabel = isFile ? (attachment.file.type || 'Archivo').toUpperCase() : null;
            const sizeLabel = isFile ? formatFileSize(attachment.file.size) : null;

            return (
              <div key={attachment.tempId} className="rounded-lg border border-amber-300/50 bg-amber-50/40 p-3 dark:bg-amber-500/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isFile ? (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="text-sm font-semibold">{attachment.title}</p>
                      <Badge variant="warning">Pendiente de guardar</Badge>
                    </div>

                    {isFile ? (
                      <p className="text-sm text-muted-foreground">
                        {mimeLabel} · {sizeLabel}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Link externo pendiente</p>
                    )}

                    {attachment.description && (
                      <p className="text-sm text-muted-foreground">{attachment.description}</p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemovePendingAttachment(attachment.tempId)}
                    disabled={!canMutate}
                  >
                    <X className="h-3.5 w-3.5" />
                    Quitar
                  </Button>
                </div>
              </div>
            );
          })}

          {sortedAttachments.map((attachment) => {
            const isFile = attachment.attachmentType === 'FILE';
            const isImage = IMAGE_MIME_TYPES.has(attachment.mimeType ?? '');
            const itemDate = new Date(attachment.createdAt).toLocaleDateString('es-AR');

            return (
              <div key={attachment.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isFile ? (
                        isImage ? (
                          <FileImage className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )
                      ) : (
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <p className="text-sm font-semibold">{attachment.title}</p>
                      <Badge variant="outline">{attachment.attachmentType === 'LINK' ? 'Link' : 'Archivo'}</Badge>
                    </div>

                    {isFile ? (
                      <p className="text-sm text-muted-foreground">
                        {formatMimeLabel(attachment.mimeType)} · {formatFileSize(attachment.fileSizeBytes)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Link externo</p>
                    )}

                    <p className="text-xs text-muted-foreground">{itemDate}</p>

                    {isFile && attachment.originalFilename && (
                      <p className="text-xs text-muted-foreground">{attachment.originalFilename}</p>
                    )}

                    {attachment.description && (
                      <p className="text-sm text-muted-foreground">{attachment.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {attachment.attachmentType === 'LINK' ? (
                      <a
                        href={attachment.externalUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir enlace
                      </a>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void openFileSignedUrl(attachment, 'VIEW')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isImage ? 'Preview' : 'Ver'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void openFileSignedUrl(attachment, 'DOWNLOAD')}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Descargar
                        </Button>
                      </>
                    )}

                    {canMutate && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(attachment)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Agregar estudio o archivo"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              requestDismissAction('CLOSE');
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-xl border bg-card p-5 shadow-lg">
            <h3 className="text-base font-semibold">Agregar estudio o archivo</h3>

            {addMode === 'CHOOSER' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAddMode('LINK')}
                  className="rounded-lg border p-4 text-left hover:bg-muted"
                >
                  <p className="text-sm font-semibold">Agregar link</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vincula estudios externos mediante una URL segura.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAddMode('FILE')}
                  className="rounded-lg border p-4 text-left hover:bg-muted"
                >
                  <p className="text-sm font-semibold">Subir archivo</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permite PDF, JPG, PNG y WEBP hasta 50 MB.
                  </p>
                </button>
              </div>
            )}

            {addMode === 'LINK' && (
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Titulo *</label>
                  <Input
                    value={linkTitle}
                    onChange={(event) => setLinkTitle(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">URL *</label>
                  <Input
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Descripcion</label>
                  <Textarea
                    value={linkDescription}
                    onChange={(event) => setLinkDescription(event.target.value)}
                  />
                </div>

                {linkError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {linkError}
                  </p>
                )}

                <div className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => requestDismissAction('BACK_TO_CHOOSER')}
                  >
                    Atras
                  </Button>
                  <Button onClick={handleConfirmLink}>
                    Confirmar
                  </Button>
                </div>
              </div>
            )}

            {addMode === 'FILE' && (
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Titulo *</label>
                  <Input
                    value={fileTitle}
                    onChange={(event) => setFileTitle(event.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Archivo *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => handleSelectFile(event.target.files?.[0] ?? null)}
                  />

                  {!selectedFile ? (
                    <Button
                      variant="destructive"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Seleccionar archivo
                    </Button>
                  ) : (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.type || 'Archivo').toUpperCase()} · {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={removeSelectedFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase text-muted-foreground">Descripcion</label>
                  <Textarea
                    value={fileDescription}
                    onChange={(event) => setFileDescription(event.target.value)}
                  />
                </div>

                {fileError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {fileError}
                  </p>
                )}

                <div className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => requestDismissAction('BACK_TO_CHOOSER')}
                  >
                    Atras
                  </Button>
                  <Button onClick={handleConfirmFile}>
                    <Upload className="h-4 w-4" />
                    Confirmar
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={closeAddModal}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        title="Eliminar este estudio o archivo?"
        description="Esta accion no se puede deshacer."
        cancelText="Cancelar"
        confirmText="Eliminar"
        confirming={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => void handleDeleteAttachment()}
      />

      <AlertDialog
        open={discardDialogOpen}
        title="Descartar este adjunto?"
        description="Hay informacion o un archivo seleccionado que todavia no fue confirmado."
        cancelText="Seguir editando"
        confirmText="Descartar"
        onCancel={() => {
          setDiscardDialogOpen(false);
          setPendingDismissAction(null);
        }}
        onConfirm={() => {
          const action = pendingDismissAction;
          setDiscardDialogOpen(false);
          setPendingDismissAction(null);
          if (action) {
            executeDismissAction(action);
          }
        }}
      />

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Preview de imagen"
        >
          <div className="w-full max-w-4xl rounded-xl border bg-card p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{preview.title}</p>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Cerrar
              </Button>
            </div>

            <div className="max-h-[80svh] overflow-auto rounded-lg bg-muted/30 p-2">
              <img src={preview.url} alt={preview.title} className="mx-auto max-h-[74svh] w-auto rounded" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
