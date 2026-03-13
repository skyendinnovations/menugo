import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { memberAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { PERMISSION_DOMAINS } from '@menugo/dto';
import type { RoleTemplate } from '@menugo/dto';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Icons for each permission domain */
const DOMAIN_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  orders: 'receipt-long',
  tables: 'table-restaurant',
  menu: 'restaurant-menu',
  staff: 'group',
  billing: 'payments',
  system: 'settings',
};

/** Accent colour + icon for each template name */
const TEMPLATE_META: Record<
  string,
  { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string; desc: string }
> = {
  kitchen: {
    icon: 'soup-kitchen',
    color: '#F97316',
    bg: '#FFF7ED',
    desc: 'Prepare and advance orders',
  },
  waiter: {
    icon: 'room-service',
    color: '#3B82F6',
    bg: '#EFF6FF',
    desc: 'Deliver orders to tables',
  },
  cashier: {
    icon: 'payments',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    desc: 'Close sessions & bills',
  },
  manager: {
    icon: 'admin-panel-settings',
    color: '#16A34A',
    bg: '#F0FDF4',
    desc: 'Full access except roles',
  },
  helper: {
    icon: 'support-agent',
    color: '#D97706',
    bg: '#FFFBEB',
    desc: 'Block / unblock tables',
  },
};

const DEFAULT_TEMPLATE_META = {
  icon: 'badge' as keyof typeof MaterialIcons.glyphMap,
  color: '#64748B',
  bg: '#F1F5F9',
  desc: 'Custom permissions',
};

// ─── Template Picker ──────────────────────────────────────────────────────────

function TemplatePicker({
  templates,
  selectedName,
  onSelect,
}: {
  templates: RoleTemplate[];
  selectedName: string | null;
  onSelect: (t: RoleTemplate) => void;
}) {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-sm font-semibold text-slate-300">
        Start from a template
      </Text>
      <Text className="mb-3 text-xs text-slate-500">
        Templates pre-fill a sensible set of permissions. You can customise
        everything after selecting one.
      </Text>

      <View className="flex-row flex-wrap gap-3">
        {templates.map((t) => {
          const meta = TEMPLATE_META[t.name.toLowerCase()] ?? DEFAULT_TEMPLATE_META;
          const isActive = selectedName === t.name;

          return (
            <TouchableOpacity
              key={t.name}
              onPress={() => onSelect(t)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: isActive ? meta.color : '#334155',
                backgroundColor: isActive ? meta.bg + '20' : '#1E293B',
                minWidth: 110,
              }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: isActive ? meta.bg : '#0F172A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <MaterialIcons
                  name={meta.icon}
                  size={18}
                  color={isActive ? meta.color : '#64748B'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: isActive ? meta.color : '#E2E8F0',
                    textTransform: 'capitalize',
                  }}>
                  {t.name}
                </Text>
                <Text style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
                  {meta.desc}
                </Text>
              </View>
              {isActive && (
                <MaterialIcons name="check-circle" size={16} color={meta.color} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedName && (
        <TouchableOpacity
          onPress={() => onSelect({ name: '', permissions: {} })}
          className="mt-3 self-start">
          <Text className="text-xs text-slate-500 underline">
            Start from scratch instead
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RoleFormScreen() {
  const { id, roleId } = useLocalSearchParams<{ id: string; roleId?: string }>();
  const router = useRouter();
  const restaurantId = Number(id);
  const isEdit = !!roleId;

  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Load existing role (edit) OR templates (create)
  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          setLoading(true);
          const res = await memberAPI.getRoles(restaurantId);
          const role = res.data?.find((r) => r.id === Number(roleId));
          if (role) {
            setName(role.name);
            setPermissions(role.permissions || {});
          }
        } catch (error) {
          console.error('Failed to fetch role:', error);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      // Fetch templates for the create flow (non-blocking — fail silently)
      memberAPI
        .getRoleTemplates(restaurantId)
        .then((res) => {
          if (res.data) setTemplates(res.data);
        })
        .catch(() => {}); // templates are optional UX sugar
    }
  }, [isEdit, roleId, restaurantId]);

  // ── Handlers ────────────────────────────────────────────────────

  const applyTemplate = (t: RoleTemplate) => {
    if (!t.name) {
      // "start from scratch" sentinel
      setSelectedTemplate(null);
      setName('');
      setPermissions({});
      return;
    }
    setSelectedTemplate(t.name);
    // Pre-fill name only when the field is still empty (don't clobber user edits)
    if (!name.trim()) {
      setName(t.name.charAt(0).toUpperCase() + t.name.slice(1));
    }
    setPermissions({ ...(t.permissions as Record<string, boolean>) });
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
    // Deselect template indicator once the user starts customising
    setSelectedTemplate(null);
  };

  const toggleDomain = (domainKeys: string[], allEnabled: boolean) => {
    setPermissions((prev) => {
      const next = { ...prev };
      for (const key of domainKeys) next[key] = !allEnabled;
      return next;
    });
    setSelectedTemplate(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      const msg = 'Role name is required';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await memberAPI.updateRole(restaurantId, Number(roleId), {
          name: name.trim(),
          permissions,
        });
      } else {
        await memberAPI.createRole(restaurantId, name.trim(), permissions);
      }
      router.back();
    } catch (error: any) {
      const msg = error?.message || 'Failed to save role';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: isEdit ? 'Edit Role' : 'Create Role' }} />
        <View className="flex-1 items-center justify-center bg-slate-900">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </>
    );
  }

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Edit Role' : 'New Role' }} />
      <ScrollView
        className="flex-1 bg-slate-900 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Template picker (create only) ─────────────────────── */}
        {!isEdit && templates.length > 0 && (
          <TemplatePicker
            templates={templates}
            selectedName={selectedTemplate}
            onSelect={applyTemplate}
          />
        )}

        {/* ── Role name ──────────────────────────────────────────── */}
        <Text className="mb-2 text-sm font-medium text-slate-300">
          Role Name
        </Text>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="e.g. Shift Manager"
          autoCapitalize="words"
        />

        {/* ── Permissions matrix ─────────────────────────────────── */}
        <View className="mb-3 mt-6 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-slate-300">Permissions</Text>
          <Text className="text-xs text-slate-500">{enabledCount} selected</Text>
        </View>

        <View className="gap-4">
          {PERMISSION_DOMAINS.map((domain) => {
            const domainKeys = domain.permissions.map((p) => p.key);
            const enabledInDomain = domainKeys.filter((k) => permissions[k]).length;
            const allEnabled = enabledInDomain === domainKeys.length;

            return (
              <View key={domain.domain} className="rounded-2xl bg-slate-800/60">
                {/* Domain header — tap to toggle all */}
                <TouchableOpacity
                  onPress={() => toggleDomain(domainKeys, allEnabled)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-row items-center gap-2.5">
                    <MaterialIcons
                      name={DOMAIN_ICONS[domain.domain] || 'folder'}
                      size={18}
                      color={enabledInDomain > 0 ? '#F97316' : '#64748B'}
                    />
                    <Text
                      className={`text-sm font-bold ${enabledInDomain > 0 ? 'text-white' : 'text-slate-400'}`}>
                      {domain.label}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-slate-500">
                      {enabledInDomain}/{domainKeys.length}
                    </Text>
                    <View
                      className={`h-5 w-5 items-center justify-center rounded ${allEnabled ? 'bg-brand' : 'border border-slate-600'}`}>
                      {allEnabled && (
                        <MaterialIcons name="check" size={14} color="#fff" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Individual permissions */}
                <View className="border-t border-slate-700/40">
                  {domain.permissions.map((perm) => (
                    <View
                      key={perm.key}
                      className="flex-row items-center justify-between border-b border-slate-700/20 px-4 py-3">
                      <View className="mr-3 flex-1">
                        <Text className="text-sm text-slate-200">
                          {perm.label}
                        </Text>
                        <Text className="mt-0.5 text-xs text-slate-500">
                          {perm.description}
                        </Text>
                      </View>
                      <Switch
                        checked={!!permissions[perm.key]}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        <Button
          title={saving ? 'Saving…' : isEdit ? 'Update Role' : 'Create Role'}
          onPress={handleSave}
          disabled={saving}
          className="mt-8"
        />
      </ScrollView>
    </>
  );
}
