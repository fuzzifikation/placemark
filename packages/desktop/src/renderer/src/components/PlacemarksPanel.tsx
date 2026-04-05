/**
 * PlacemarksPanel — left-side panel listing smart and user-saved placemarks.
 * Users can activate a placemark to jump to its geo+time bounds, save new ones,
 * or delete existing ones.
 */

import { useState, useRef, useEffect } from 'react';
import { X, Bookmark, Plus, Trash2, Calendar, MapPin, Save } from 'lucide-react';
import { type Theme } from '../theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useReverseGeocoding } from '../hooks/useReverseGeocoding';
import {
  FONT_FAMILY,
  BORDER_RADIUS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  getGlassStyle,
} from '../constants/ui';
import type { PlacemarkWithCount, PlacemarkSmartCounts } from '../types/preload.d';
import type { CreatePlacemarkInput, PlacemarkBounds } from '@placemark/core';
import { formatNumber } from '../utils/formatLocale';

interface PlacemarksPanelProps {
  placemarks: PlacemarkWithCount[];
  smartCounts: PlacemarkSmartCounts;
  activePlacemarkId: number | 'thisYear' | 'last3Months' | null;
  currentBounds: PlacemarkBounds | null;
  currentDateRange: { start: number; end: number } | null;
  onActivate: (id: number | 'thisYear' | 'last3Months' | null) => void;
  onCreate: (input: CreatePlacemarkInput) => Promise<PlacemarkWithCount>;
  onUpdate: (
    id: number,
    input: {
      name?: string;
      bounds?: PlacemarkBounds | null;
      dateStart?: string | null;
      dateEnd?: string | null;
    }
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
  onRefreshPlacemarks: () => Promise<void>;
  theme: Theme;
  glassBlur: number;
  glassSurfaceOpacity: number;
  reverseGeocodeEnabled: boolean;
}

/** Derive a suggested name from the current date range */
function suggestName(dateRange: { start: number; end: number } | null): string {
  if (!dateRange) return '';
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (startYear === endYear) return String(startYear);
  return `${startYear}–${endYear}`;
}

// ─────────────────────────────────────────────────────────────────────────────

/** Format an ISO date string as a short readable label */
function formatDateLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

function formatCenterLabel(bounds: PlacemarkBounds | null): string | null {
  if (!bounds) return null;
  const lat = ((bounds.north + bounds.south) / 2).toFixed(4);
  const lng = ((bounds.east + bounds.west) / 2).toFixed(4);
  return `${lat}, ${lng}`;
}

export function PlacemarksPanel({
  placemarks,
  smartCounts,
  activePlacemarkId,
  currentBounds,
  currentDateRange,
  onActivate,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
  onRefreshPlacemarks,
  theme,
  glassBlur,
  glassSurfaceOpacity,
  reverseGeocodeEnabled,
}: PlacemarksPanelProps) {
  const colors = useThemeColors(theme);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Reverse geocoding labels — lazily fetched from Nominatim, cached by placemark ID.
  const geoLabels = useReverseGeocoding(placemarks, reverseGeocodeEnabled, onRefreshPlacemarks);

  // Set suggested name and focus input when form first opens.
  // currentDateRange is intentionally NOT in deps — we don't want to reset
  // the name the user is typing just because the date filter changes.
  useEffect(() => {
    if (showNewForm) {
      setNewName(suggestName(currentDateRange));
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNewForm]);

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const handleOpenNewForm = () => {
    setShowNewForm(true);
  };

  const handleCancelNew = () => {
    setShowNewForm(false);
    setNewName('');
    setNameError(null);
  };

  const handleSave = async () => {
    const name = newName.trim();
    if (!name) return;
    if (placemarks.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setNameError('A placemark with this name already exists.');
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        name,
        bounds: currentBounds ?? null,
        dateStart: currentDateRange
          ? new Date(currentDateRange.start).toISOString().slice(0, 10)
          : null,
        dateEnd: currentDateRange
          ? new Date(currentDateRange.end).toISOString().slice(0, 10)
          : null,
      });
      setShowNewForm(false);
      setNewName('');
      setNameError(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getCurrentDateIso = () => {
    if (!currentDateRange) {
      return { dateStart: null as string | null, dateEnd: null as string | null };
    }
    return {
      dateStart: new Date(currentDateRange.start).toISOString().slice(0, 10),
      dateEnd: new Date(currentDateRange.end).toISOString().slice(0, 10),
    };
  };

  const handleUpdatePlacemark = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const placemark = placemarks.find((x) => x.id === id);
    const placemarkName = placemark?.name ?? 'this placemark';
    const confirmUpdate = window.confirm(
      `Update "${placemarkName}" with the current map view and timeline range?`
    );
    if (!confirmUpdate) return;

    const { dateStart, dateEnd } = getCurrentDateIso();
    setUpdatingId(id);
    try {
      await onUpdate(id, {
        bounds: currentBounds ?? null,
        dateStart,
        dateEnd,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const startRename = (p: PlacemarkWithCount, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditName(p.name);
    setEditError(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditName('');
    setEditError(null);
  };

  const submitRename = async (p: PlacemarkWithCount) => {
    const name = editName.trim();
    if (!name) {
      setEditError('Name cannot be empty.');
      return;
    }
    const duplicate = placemarks.some(
      (x) => x.id !== p.id && x.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      setEditError('A placemark with this name already exists.');
      return;
    }
    if (name === p.name) {
      cancelRename();
      return;
    }
    setUpdatingId(p.id);
    try {
      await onUpdate(p.id, { name });
      cancelRename();
    } finally {
      setUpdatingId(null);
    }
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: FONT_SIZE.XS,
    fontWeight: FONT_WEIGHT.MEDIUM,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    padding: `${SPACING.SM} ${SPACING.LG}`,
    margin: 0,
  };

  const rowBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.SM} ${SPACING.LG}`,
    cursor: 'pointer',
    borderRadius: BORDER_RADIUS.MD,
    margin: `0 ${SPACING.SM}`,
    transition: 'background-color 0.15s ease',
    userSelect: 'none' as const,
  };

  const renderSmartRow = (
    id: 'thisYear' | 'last3Months',
    label: string,
    count: number,
    subtitle: string
  ) => {
    const isActive = activePlacemarkId === id;
    return (
      <div
        key={id}
        style={{
          ...rowBase,
          backgroundColor: isActive ? `${colors.primary}20` : 'transparent',
          border: isActive ? `1px solid ${colors.primary}40` : '1px solid transparent',
        }}
        onClick={() => onActivate(id)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM, minWidth: 0 }}>
          <Calendar
            size={14}
            color={isActive ? colors.primary : colors.textMuted}
            style={{ flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: FONT_SIZE.SM,
                fontWeight: isActive ? FONT_WEIGHT.MEDIUM : FONT_WEIGHT.NORMAL,
                color: isActive ? colors.primary : colors.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted }}>{subtitle}</div>
          </div>
        </div>
        <span
          style={{
            fontSize: FONT_SIZE.XS,
            color: isActive ? colors.primary : colors.textMuted,
            fontWeight: FONT_WEIGHT.MEDIUM,
            flexShrink: 0,
            marginLeft: SPACING.SM,
          }}
        >
          {formatNumber(count)}
        </span>
      </div>
    );
  };

  const renderUserRow = (p: PlacemarkWithCount) => {
    const isActive = activePlacemarkId === p.id;
    const isDeleting = deletingId === p.id;
    const isUpdating = updatingId === p.id;
    const isEditing = editingId === p.id;

    const hasDate = p.dateStart !== null || p.dateEnd !== null;
    const geoLabel = geoLabels.get(p.id) ?? null;
    const centerLabel = formatCenterLabel(p.bounds);
    const locationLabel = geoLabel ?? centerLabel;
    const dateLabel = hasDate
      ? `${formatDateLabel(p.dateStart)}${p.dateEnd && p.dateEnd !== p.dateStart ? ' – ' + formatDateLabel(p.dateEnd) : ''}`
      : null;

    return (
      <div
        key={p.id}
        style={{
          ...rowBase,
          backgroundColor: isActive
            ? `${colors.primary}20`
            : hoveredRowId === p.id
              ? colors.surfaceHover
              : 'transparent',
          border: isActive ? `1px solid ${colors.primary}40` : '1px solid transparent',
          opacity: isDeleting ? 0.5 : 1,
        }}
        onClick={() => onActivate(p.id)}
        onMouseEnter={() => setHoveredRowId(p.id)}
        onMouseLeave={() => setHoveredRowId(null)}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM, minWidth: 0, flex: 1 }}
        >
          <MapPin
            size={14}
            color={isActive ? colors.primary : colors.textMuted}
            style={{ flexShrink: 0 }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            {isEditing ? (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void submitRename(p);
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  onBlur={() => {
                    if (!isUpdating) cancelRename();
                  }}
                  maxLength={80}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '2px 6px',
                    fontSize: FONT_SIZE.SM,
                    backgroundColor: colors.surface,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: BORDER_RADIUS.SM,
                    outline: 'none',
                    fontFamily: FONT_FAMILY,
                  }}
                />
                {editError && (
                  <div style={{ fontSize: FONT_SIZE.XS, color: '#ef4444', marginTop: '2px' }}>
                    {editError}
                  </div>
                )}
              </div>
            ) : (
              <div
                onDoubleClick={(e) => startRename(p, e)}
                title="Double-click to rename"
                style={{
                  fontSize: FONT_SIZE.SM,
                  fontWeight: isActive ? FONT_WEIGHT.MEDIUM : FONT_WEIGHT.NORMAL,
                  color: isActive ? colors.primary : colors.textPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </div>
            )}
            {locationLabel && (
              <div
                style={{
                  fontSize: FONT_SIZE.XS,
                  color: colors.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {locationLabel}
              </div>
            )}
            {dateLabel && (
              <div
                style={{
                  fontSize: FONT_SIZE.XS,
                  color: colors.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {dateLabel}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.SM,
            flexShrink: 0,
            marginLeft: SPACING.SM,
          }}
        >
          <button
            onClick={(e) => handleUpdatePlacemark(p.id, e)}
            disabled={isUpdating || isDeleting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isUpdating || isDeleting ? 'not-allowed' : 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              color: '#16a34a',
              opacity: hoveredRowId === p.id ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
            title={`Update "${p.name}" from current view`}
          >
            <Save size={13} />
          </button>
          <button
            onClick={(e) => handleDelete(p.id, e)}
            disabled={isDeleting || isUpdating}
            style={{
              background: 'none',
              border: 'none',
              cursor: isDeleting || isUpdating ? 'not-allowed' : 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              color: '#dc2626',
              opacity: hoveredRowId === p.id ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
            title={`Delete "${p.name}"`}
          >
            <Trash2 size={13} />
          </button>
          <span
            style={{
              fontSize: FONT_SIZE.XS,
              color: isActive ? colors.primary : colors.textMuted,
              fontWeight: FONT_WEIGHT.MEDIUM,
              minWidth: '2.75rem',
              textAlign: 'right',
            }}
          >
            {formatNumber(p.photoCount)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...getGlassStyle(colors, glassBlur, glassSurfaceOpacity),
        fontFamily: FONT_FAMILY,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `${SPACING.MD} ${SPACING.LG}`,
          borderBottom: `1px solid ${colors.glassBorder}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
          <Bookmark size={14} color={colors.primary} />
          <span
            style={{
              fontSize: FONT_SIZE.SM,
              fontWeight: FONT_WEIGHT.MEDIUM,
              color: colors.textPrimary,
            }}
          >
            Placemarks
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: colors.textMuted,
            borderRadius: BORDER_RADIUS.SM,
            display: 'flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = colors.textPrimary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = colors.textMuted;
          }}
          title="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable content */}
      <div
        style={{ overflowY: 'auto', flex: 1, paddingTop: SPACING.XS, paddingBottom: SPACING.SM }}
      >
        {/* Smart placemarks section */}
        <p style={sectionLabel}>Smart</p>
        {renderSmartRow(
          'thisYear',
          'This Year',
          smartCounts.thisYear,
          new Date().getFullYear().toString()
        )}
        {renderSmartRow('last3Months', 'Last 3 Months', smartCounts.last3Months, 'Rolling 90 days')}

        {/* User placemarks section */}
        <p style={{ ...sectionLabel, marginTop: SPACING.LG }}>My Placemarks</p>

        {placemarks.length === 0 && !showNewForm && (
          <div
            style={{
              padding: `${SPACING.SM} ${SPACING.LG}`,
              color: colors.textMuted,
              fontSize: FONT_SIZE.XS,
            }}
          >
            No placemarks saved yet.
          </div>
        )}

        {placemarks.map(renderUserRow)}

        {/* New placemark inline form */}
        {showNewForm ? (
          <div
            style={{
              padding: `${SPACING.SM} ${SPACING.LG}`,
              display: 'flex',
              flexDirection: 'column',
              gap: SPACING.SM,
            }}
          >
            <input
              ref={nameInputRef}
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (nameError) setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancelNew();
              }}
              placeholder="Placemark name"
              maxLength={80}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: `${SPACING.SM} ${SPACING.MD}`,
                fontSize: FONT_SIZE.SM,
                backgroundColor: colors.surface,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: BORDER_RADIUS.MD,
                outline: 'none',
                fontFamily: FONT_FAMILY,
              }}
            />
            {nameError && (
              <div style={{ fontSize: FONT_SIZE.XS, color: '#ef4444' }}>{nameError}</div>
            )}
            <div style={{ fontSize: FONT_SIZE.XS, color: colors.textMuted }}>
              {currentBounds && 'Map view · '}
              {currentDateRange
                ? `${new Date(currentDateRange.start).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} – ${new Date(currentDateRange.end).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
                : 'No date filter'}
            </div>
            <div style={{ display: 'flex', gap: SPACING.SM }}>
              <button
                onClick={handleSave}
                disabled={saving || !newName.trim()}
                style={{
                  flex: 1,
                  padding: `${SPACING.XS} ${SPACING.MD}`,
                  fontSize: FONT_SIZE.SM,
                  fontWeight: FONT_WEIGHT.MEDIUM,
                  backgroundColor: colors.primary,
                  color: colors.buttonText,
                  border: 'none',
                  borderRadius: BORDER_RADIUS.MD,
                  cursor: saving || !newName.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !newName.trim() ? 0.6 : 1,
                  fontFamily: FONT_FAMILY,
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleCancelNew}
                style={{
                  padding: `${SPACING.XS} ${SPACING.MD}`,
                  fontSize: FONT_SIZE.SM,
                  backgroundColor: 'transparent',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: BORDER_RADIUS.MD,
                  cursor: 'pointer',
                  fontFamily: FONT_FAMILY,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleOpenNewForm}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.SM,
              margin: `${SPACING.SM} ${SPACING.LG}`,
              padding: `${SPACING.SM} ${SPACING.MD}`,
              fontSize: FONT_SIZE.SM,
              color: colors.primary,
              backgroundColor: 'transparent',
              border: `1px dashed ${colors.primary}60`,
              borderRadius: BORDER_RADIUS.MD,
              cursor: 'pointer',
              fontFamily: FONT_FAMILY,
              width: `calc(100% - ${SPACING.LG} - ${SPACING.LG})`,
            }}
          >
            <Plus size={14} />
            Save current view
          </button>
        )}
      </div>
    </div>
  );
}
