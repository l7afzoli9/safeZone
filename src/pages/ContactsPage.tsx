import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../context/AppContext';
import { validateContactForm } from '../lib/validation';
import type { TrustedContact } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { toast } from '../components/ui/Toast';
import { ContactChip } from '../components/domain/ContactChip';
import { EmptyState, ErrorState, LoadingListSkeleton } from '../components/domain/EmptyState';

const RELATION_KEYS = [
  'contacts.relations.family',
  'contacts.relations.friend',
  'contacts.relations.colleague',
  'contacts.relations.neighbor',
] as const;

export const ContactsPage: React.FC = () => {
  const { t } = useI18n();
  const { contacts, loading, error, refreshAll, saveContact, deleteContact } = useApp();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<TrustedContact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationKey, setRelationKey] = useState<string>(RELATION_KEYS[0]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TrustedContact | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setPhone('');
    setRelationKey(RELATION_KEYS[0]);
    setNameError(null);
    setPhoneError(null);
    setSheetOpen(true);
  };

  const openEdit = (contact: TrustedContact) => {
    setEditing(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setRelationKey(contact.relation_key || RELATION_KEYS[0]);
    setNameError(null);
    setPhoneError(null);
    setSheetOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nameErrorKey, phoneErrorKey } = validateContactForm(name, phone);
    setNameError(nameErrorKey ? t(nameErrorKey) : null);
    setPhoneError(phoneErrorKey ? t(phoneErrorKey) : null);
    if (nameErrorKey || phoneErrorKey) return;

    setSaving(true);
    try {
      await saveContact({
        id: editing?.id,
        name,
        phone,
        relation_key: relationKey,
      });
      setSheetOpen(false);
      toast.success(t('contacts.savedToast'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContact(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(t('contacts.deletedToast'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.375rem] font-extrabold text-[var(--text-primary)]">
            {t('contacts.title')}
          </h1>
          <p className="mt-1 text-[0.9375rem] text-[var(--text-secondary)]">
            {t('contacts.subtitle')}
          </p>
        </div>
      </div>

      <Button variant="primary" size="lg" fullWidth onClick={openAdd}>
        <Plus className="h-5 w-5" aria-hidden="true" />
        <span>{t('contacts.addBtn')}</span>
      </Button>

      {loading ? (
        <LoadingListSkeleton count={2} />
      ) : error ? (
        <ErrorState onRetry={() => void refreshAll()} />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
          title={t('contacts.emptyTitle')}
          description={t('contacts.emptyDesc')}
          actionLabel={t('contacts.addBtn')}
          onAction={openAdd}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <ContactChip
              key={contact.id}
              contact={contact}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Contact Sheet */}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={editing ? t('contacts.editTitle') : t('contacts.addTitle')}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
          <Input
            label={t('contacts.nameLabel')}
            placeholder={t('contacts.namePlaceholder')}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            error={nameError}
            autoComplete="name"
          />

          <Input
            type="tel"
            dir="ltr"
            label={t('contacts.phoneLabel')}
            placeholder={t('contacts.phonePlaceholder')}
            hint={t('contacts.phoneHint')}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError(null);
            }}
            error={phoneError}
            autoComplete="tel"
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contact-relation"
              className="text-[0.9375rem] font-semibold text-[var(--text-primary)]"
            >
              {t('contacts.relationLabel')}
            </label>
            <select
              id="contact-relation"
              value={relationKey}
              onChange={(e) => setRelationKey(e.target.value)}
              className="min-h-[46px] w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-base text-[var(--text-primary)]"
            >
              {RELATION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={saving}>
              {t('common.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => setSheetOpen(false)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Delete Contact Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('contacts.deleteConfirmTitle')}
        description={
          deleteTarget
            ? t('contacts.deleteConfirmDesc', { name: deleteTarget.name })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        confirmVariant="alert"
        loading={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
