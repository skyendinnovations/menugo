import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useMemo, useRef, useEffect, createElement } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type Role } from '@/lib/api';
import { notificationAPI } from '@/lib/api/notification';
import {
  workflowAPI,
  type FlowConfig,
  type FlowStepDetail,
  type FlowStepInput,
} from '@/lib/api/workflow';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
import type { NotificationSettingsMatrix } from '@menugo/dto';

// ─── Theme ─────────────────────────────────────────────────────
const WHITE = '#FFFFFF';
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const GRAY_50 = '#F9FAFB';
const GRAY_100 = '#F3F4F6';
const GRAY_200 = '#E5E7EB';
const GRAY_400 = '#9CA3AF';
const GRAY_500 = '#6B7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';
const GREEN = '#16A34A';
const GREEN_LIGHT = '#F0FDF4';
const BLUE = '#2563EB';
const BLUE_LIGHT = '#EFF6FF';
const AMBER = '#D97706';
const AMBER_LIGHT = '#FFFBEB';

// ─── Icons ─────────────────────────────────────────────────────
const ROLE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  owner: 'shield',
  manager: 'admin-panel-settings',
  kitchen: 'soup-kitchen',
  waiter: 'room-service',
  cashier: 'payments',
  helper: 'support-agent',
};

const getRoleIcon = (name: string): keyof typeof MaterialIcons.glyphMap =>
  ROLE_ICONS[name.toLowerCase()] || 'badge';

const STATUS_COLORS: Record<string, string> = {
  received: '#3B82F6',
  preparing: '#F97316',
  ready: '#22C55E',
  served: '#06B6D4',
  paid: '#8B5CF6',
};

// ─── Subcomponents ─────────────────────────────────────────────

function FlowArrow({ label, color }: { label?: string; color?: string }) {
  const c = color || GRAY_400;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 2 }}>
      <View style={{ width: 2, height: label ? 8 : 14, backgroundColor: c + '40' }} />
      {label && (
        <Text style={{ fontSize: 9, color: c, fontWeight: '600', marginVertical: 2 }}>
          {label}
        </Text>
      )}
      <View style={{ width: 2, height: label ? 4 : 0, backgroundColor: c + '40' }} />
      <MaterialIcons name="arrow-drop-down" size={18} color={c + '70'} style={{ marginTop: -5 }} />
    </View>
  );
}

function StepNode({
  step,
  index,
  totalSteps,
  matrixEvent,
  allRoles,
  onRemove,
  onMoveUp,
  onMoveDown,
  onToggleAccept,
  onNotifToggle,
}: {
  step: FlowStepDetail;
  index: number;
  totalSteps: number;
  matrixEvent: NotificationSettingsMatrix | undefined;
  allRoles: Role[];
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleAccept: () => void;
  onNotifToggle: (triggerEvent: string, roleId: number, currentlyEnabled: boolean) => void;
}) {
  const entryColor = STATUS_COLORS[step.entryStatus] || GRAY_500;
  const exitColor = STATUS_COLORS[step.exitStatus] || GRAY_500;
  const icon = getRoleIcon(step.roleName);

  return (
    <View
      style={{
        backgroundColor: WHITE,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: GRAY_200,
        overflow: 'hidden',
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
          android: { elevation: 2 },
          web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } as any,
        }),
      }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: GRAY_50,
          borderBottomWidth: 1,
          borderBottomColor: GRAY_200,
          gap: 10,
        }}>
        {/* Role icon */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: RED_LIGHT,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialIcons name={icon} size={20} color={RED} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: GRAY_900,
              textTransform: 'capitalize',
            }}>
            {step.roleName}
          </Text>
          <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 1 }}>
            Step {index + 1} of {totalSteps}
          </Text>
        </View>

        {/* Move up / down / remove */}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {index > 0 && (
            <TouchableOpacity
              onPress={onMoveUp}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: GRAY_100,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcons name="arrow-upward" size={16} color={GRAY_500} />
            </TouchableOpacity>
          )}
          {index < totalSteps - 1 && (
            <TouchableOpacity
              onPress={onMoveDown}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: GRAY_100,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcons name="arrow-downward" size={16} color={GRAY_500} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onRemove}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcons name="close" size={16} color={RED} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status badges */}
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: entryColor + '15',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: entryColor }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: entryColor }}>
              {step.entryStatusLabel}
            </Text>
          </View>

          <MaterialIcons name="arrow-forward" size={14} color={GRAY_400} />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: exitColor + '15',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: exitColor }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: exitColor }}>
              {step.exitStatusLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Accept button toggle */}
      <TouchableOpacity
        onPress={onToggleAccept}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginHorizontal: 14,
          marginTop: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: step.showAcceptButton ? GREEN_LIGHT : GRAY_50,
          borderWidth: 1,
          borderColor: step.showAcceptButton ? GREEN + '30' : GRAY_200,
        }}>
        <MaterialIcons
          name={step.showAcceptButton ? 'check-box' : 'check-box-outline-blank'}
          size={18}
          color={step.showAcceptButton ? GREEN : GRAY_400}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: step.showAcceptButton ? GREEN : GRAY_500,
            flex: 1,
          }}>
          Show Accept Button
        </Text>
        {step.showAcceptButton && (
          <View
            style={{
              backgroundColor: GREEN + '15',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: GREEN }}>ACTIVE</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Notification toggles */}
      <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: GRAY_500, marginBottom: 6 }}>
          Notify when order arrives here:
        </Text>
        {matrixEvent ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {matrixEvent.roles.map((role) => (
              <TouchableOpacity
                key={role.roleId}
                onPress={() =>
                  onNotifToggle(matrixEvent.triggerEvent, role.roleId, role.enabled)
                }
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                  backgroundColor: role.enabled ? AMBER_LIGHT : GRAY_50,
                  borderWidth: 1,
                  borderColor: role.enabled ? AMBER + '40' : GRAY_200,
                }}>
                <MaterialIcons
                  name={getRoleIcon(role.roleName)}
                  size={12}
                  color={role.enabled ? AMBER : GRAY_400}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: role.enabled ? '700' : '500',
                    color: role.enabled ? GRAY_900 : GRAY_500,
                    textTransform: 'capitalize',
                  }}>
                  {role.roleName}
                </Text>
                <MaterialIcons
                  name={role.enabled ? 'notifications-active' : 'notifications-off'}
                  size={11}
                  color={role.enabled ? AMBER : GRAY_400}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 11, color: GRAY_400, fontStyle: 'italic' }}>
            Save flow first to configure notifications
          </Text>
        )}
      </View>
    </View>
  );
}

function RoleListItem({
  role,
  onEdit,
  onDelete,
}: {
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isOwner = role.name.toLowerCase() === 'owner';
  const permCount = Object.values(role.permissions || {}).filter(Boolean).length;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 10,
      }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: isOwner ? AMBER_LIGHT : RED_LIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialIcons
          name={getRoleIcon(role.name)}
          size={18}
          color={isOwner ? AMBER : RED}
        />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={{
              color: GRAY_900,
              fontSize: 14,
              fontWeight: '700',
              textTransform: 'capitalize',
            }}>
            {role.name}
          </Text>
          {isOwner && (
            <View
              style={{
                backgroundColor: AMBER_LIGHT,
                paddingHorizontal: 5,
                paddingVertical: 1,
                borderRadius: 4,
              }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: AMBER }}>PROTECTED</Text>
            </View>
          )}
        </View>
        <Text style={{ color: GRAY_500, fontSize: 11, marginTop: 2 }}>
          {permCount} permission{permCount !== 1 ? 's' : ''}
        </Text>
      </View>

      {!isOwner && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: GRAY_100,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcons name="edit" size={15} color={GRAY_500} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: RED_LIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialIcons name="delete-outline" size={15} color={RED} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Status derivation (must match backend) ────────────────────
function computeStepStatuses(
  count: number,
): Array<{ entry: string; exit: string }> {
  if (count <= 0) return [];
  if (count === 1) return [{ entry: 'received', exit: 'paid' }];
  if (count === 2)
    return [
      { entry: 'received', exit: 'served' },
      { entry: 'served', exit: 'paid' },
    ];
  if (count === 3)
    return [
      { entry: 'received', exit: 'ready' },
      { entry: 'ready', exit: 'served' },
      { entry: 'served', exit: 'paid' },
    ];
  return [
    { entry: 'received', exit: 'preparing' },
    { entry: 'preparing', exit: 'ready' },
    { entry: 'ready', exit: 'served' },
    { entry: 'served', exit: 'paid' },
  ].slice(0, Math.min(count, 4));
}

const STATUS_LABELS: Record<string, string> = {
  received: 'New Order',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  paid: 'Completed',
};

// ─── Node Editor ───────────────────────────────────────────────
const NODE_W = 170;
const NODE_H = 56;
const CANVAS_H = 420;
const PORT_R = 5;

type Pos = { x: number; y: number };
type Edge = { from: string; to: string };

function getPortPos(nodePos: Pos, side: 'out' | 'in'): Pos {
  return side === 'out'
    ? { x: nodePos.x + NODE_W, y: nodePos.y + NODE_H / 2 }
    : { x: nodePos.x, y: nodePos.y + NODE_H / 2 };
}

function buildDefaultEdges(stepCount: number): Edge[] {
  const edges: Edge[] = [];
  const keys = ['start', ...Array.from({ length: stepCount }, (_, i) => `step-${i}`), 'end'];
  for (let i = 0; i < keys.length - 1; i++) {
    edges.push({ from: keys[i]!, to: keys[i + 1]! });
  }
  return edges;
}

// Derive step ordering from edges (walk the graph start→…→end)
function deriveStepOrder(edges: Edge[], stepCount: number): number[] {
  const adj = new Map<string, string>();
  for (const e of edges) adj.set(e.from, e.to);
  const order: number[] = [];
  let cur = adj.get('start');
  const visited = new Set<string>();
  while (cur && cur !== 'end' && !visited.has(cur)) {
    visited.add(cur);
    if (cur.startsWith('step-')) {
      order.push(parseInt(cur.split('-')[1]!));
    }
    cur = adj.get(cur);
  }
  // Add any unconnected steps at the end
  for (let i = 0; i < stepCount; i++) {
    if (!order.includes(i)) order.push(i);
  }
  return order;
}

function autoLayoutPositions(stepCount: number, canvasW: number): Record<string, Pos> {
  const positions: Record<string, Pos> = {};
  const totalNodes = stepCount + 2;
  const spacing = Math.max(canvasW / (totalNodes + 1), 200);
  const cy = CANVAS_H / 2 - NODE_H / 2;
  positions['start'] = { x: spacing - NODE_W / 2, y: cy };
  for (let i = 0; i < stepCount; i++) {
    positions[`step-${i}`] = { x: spacing * (i + 2) - NODE_W / 2, y: cy };
  }
  positions['end'] = { x: spacing * (totalNodes) - NODE_W / 2, y: cy };
  return positions;
}

function bezierPath(from: Pos, to: Pos): string {
  const dx = Math.abs(to.x - from.x) * 0.45;
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

// ─── Main Screen ───────────────────────────────────────────────

export default function RolesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const restaurantId = Number(id);

  const [roles, setRoles] = useState<Role[]>([]);
  const [matrix, setMatrix] = useState<NotificationSettingsMatrix[]>([]);
  const [flowConfig, setFlowConfig] = useState<FlowConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local flow state (unsaved)
  const [localSteps, setLocalSteps] = useState<FlowStepInput[]>([]);
  const [flowDirty, setFlowDirty] = useState(false);

  // Inline role creation
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Node editor
  const [nodePositions, setNodePositions] = useState<Record<string, Pos>>({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const dragRef = useRef<{
    key: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const prevStepCountRef = useRef(-1);

  // Edge connections (user-controllable wires)
  const [edges, setEdges] = useState<Edge[]>([]);
  const [wireDragPos, setWireDragPos] = useState<Pos | null>(null);
  const [wireDragFrom, setWireDragFrom] = useState<string | null>(null);
  const canvasRef = useRef<View>(null);
  const canvasOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, matrixRes, configRes] = await Promise.all([
        memberAPI.getRoles(restaurantId),
        notificationAPI.getSettings(restaurantId),
        workflowAPI.getFlowConfig(restaurantId),
      ]);
      setRoles(rolesRes.data || []);
      setMatrix(matrixRes.data || []);
      const config = configRes.data;
      setFlowConfig(config);
      if (config) {
        setLocalSteps(
          config.steps.map((s) => ({
            roleId: s.roleId,
            showAcceptButton: s.showAcceptButton,
          })),
        );
      }
      setFlowDirty(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // ── Computed step details from local state ──
  const computedSteps = useMemo((): FlowStepDetail[] => {
    const statuses = computeStepStatuses(localSteps.length);
    return localSteps.map((step, i) => {
      const role = roles.find((r) => r.id === step.roleId);
      const st = statuses[i] || { entry: 'received', exit: 'paid' };
      return {
        roleId: step.roleId,
        roleName: role?.name || 'Unknown',
        showAcceptButton: step.showAcceptButton,
        entryStatus: st.entry,
        exitStatus: st.exit,
        entryStatusLabel: STATUS_LABELS[st.entry] || st.entry,
        exitStatusLabel: STATUS_LABELS[st.exit] || st.exit,
        triggerEvent:
          i === 0
            ? 'order_placed'
            : `status_${statuses[i - 1]!.entry}_to_${statuses[i - 1]!.exit}`,
      };
    });
  }, [localSteps, roles]);

  // ── Available roles (not in flow, not owner/manager) ──
  const availableRoles = useMemo(() => {
    const stepRoleIds = new Set(localSteps.map((s) => s.roleId));
    return roles.filter(
      (r) =>
        !stepRoleIds.has(r.id) &&
        r.name.toLowerCase() !== 'owner' &&
        r.name.toLowerCase() !== 'manager',
    );
  }, [roles, localSteps]);

  // ── Notification matrix map by trigger event ──
  const matrixByEvent = useMemo(() => {
    const map = new Map<string, NotificationSettingsMatrix>();
    for (const event of matrix) map.set(event.triggerEvent, event);
    return map;
  }, [matrix]);

  // ── Auto-layout nodes ──
  useEffect(() => {
    if (localSteps.length !== prevStepCountRef.current) {
      prevStepCountRef.current = localSteps.length;
      setNodePositions(autoLayoutPositions(localSteps.length, canvasWidth));
      setEdges(buildDefaultEdges(localSteps.length));
      setSelectedNode(null);
    }
  }, [localSteps.length, canvasWidth]);

  // ── Global pointer events for wire dragging (web) ──
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMove = (e: PointerEvent) => {
      if (!wireDragFrom) return;
      setWireDragPos({ x: e.pageX - canvasOffsetRef.current.x, y: e.pageY - canvasOffsetRef.current.y });
    };
    const onUp = (e: PointerEvent) => {
      if (!wireDragFrom) return;
      handlePortDragEnd(e.pageX, e.pageY);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [wireDragFrom]);

  // ── Wire connections (derived from edges) ──
  const wireConnections = useMemo(() => {
    const conns: Array<{ from: Pos; to: Pos; color: string; label: string; edgeIdx: number }> = [];
    edges.forEach((edge, edgeIdx) => {
      const fromNodePos = nodePositions[edge.from];
      const toNodePos = nodePositions[edge.to];
      if (!fromNodePos || !toNodePos) return;
      const from = getPortPos(fromNodePos, 'out');
      const to = getPortPos(toNodePos, 'in');
      // Color based on source node
      let color = GRAY_400;
      let label = '';
      if (edge.from === 'start') {
        color = STATUS_COLORS['received'] || GRAY_400;
        label = 'received';
      } else if (edge.from.startsWith('step-')) {
        const stepIdx = parseInt(edge.from.split('-')[1]!);
        const step = computedSteps[stepIdx];
        if (step) {
          color = STATUS_COLORS[step.exitStatus] || GRAY_400;
          label = step.exitStatusLabel;
        }
      }
      conns.push({ from, to, color, label, edgeIdx });
    });
    return conns;
  }, [edges, nodePositions, computedSteps]);

  // ── Port drag handlers (wire connect/disconnect) ──
  const handlePortDragStart = (nodeKey: string, side: 'out' | 'in', pageX: number, pageY: number) => {
    if (side === 'out') {
      // Dragging from output port — disconnect any existing edge from this output
      setEdges((prev) => prev.filter((e) => e.from !== nodeKey));
      setWireDragFrom(nodeKey);
    } else {
      // Dragging from input port — disconnect and start re-dragging the wire that was connected here
      const existingEdge = edges.find((e) => e.to === nodeKey);
      if (existingEdge) {
        setEdges((prev) => prev.filter((e) => e.to !== nodeKey));
        setWireDragFrom(existingEdge.from);
      } else {
        return; // Nothing connected to disconnect
      }
    }
    // Measure canvas offset synchronously (web)
    if (canvasRef.current && Platform.OS === 'web') {
      const el = canvasRef.current as unknown as HTMLElement;
      if (el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect();
        canvasOffsetRef.current = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
      }
    }
    setWireDragPos({ x: pageX - canvasOffsetRef.current.x, y: pageY - canvasOffsetRef.current.y });
  };

  const handlePortDragMove = (pageX: number, pageY: number) => {
    if (!wireDragFrom) return;
    setWireDragPos({ x: pageX - canvasOffsetRef.current.x, y: pageY - canvasOffsetRef.current.y });
  };

  const handlePortDragEnd = (pageX: number, pageY: number) => {
    if (!wireDragFrom) return;
    // Find if we dropped on an input port
    const dropX = pageX - canvasOffsetRef.current.x;
    const dropY = pageY - canvasOffsetRef.current.y;
    const allTargets = [
      ...computedSteps.map((_, i) => `step-${i}`),
      'end',
    ];
    let connected = false;
    for (const target of allTargets) {
      if (target === wireDragFrom) continue; // Can't connect to self
      const tPos = nodePositions[target];
      if (!tPos) continue;
      const inputPort = getPortPos(tPos, 'in');
      const dist = Math.sqrt((dropX - inputPort.x) ** 2 + (dropY - inputPort.y) ** 2);
      if (dist < 25) {
        // Check not already connected to this input
        setEdges((prev) => {
          const filtered = prev.filter((e) => e.to !== target); // Remove existing edge to this input
          return [...filtered, { from: wireDragFrom!, to: target }];
        });
        setFlowDirty(true);
        connected = true;
        break;
      }
    }
    // If dropped on output port of start (for reconnecting)
    if (!connected) {
      // Also check connecting to start's output (shouldn't happen, it's output only)
      // Wire is just dropped into empty space — the disconnection stands
      setFlowDirty(true);
    }
    setWireDragFrom(null);
    setWireDragPos(null);
  };

  const handleEdgeClick = (edgeIdx: number) => {
    setEdges((prev) => prev.filter((_, i) => i !== edgeIdx));
    setFlowDirty(true);
  };

  // ── Node drag handlers ──
  const handleNodeDragStart = (key: string, pageX: number, pageY: number) => {
    const pos = nodePositions[key];
    if (!pos) return;
    dragRef.current = { key, startX: pageX, startY: pageY, origX: pos.x, origY: pos.y, moved: false };
  };

  const handleNodeDragMove = (pageX: number, pageY: number) => {
    if (!dragRef.current) return;
    const { key, startX, startY, origX, origY } = dragRef.current;
    const dx = pageX - startX;
    const dy = pageY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    setNodePositions((prev) => ({ ...prev, [key]: { x: origX + dx, y: origY + dy } }));
  };

  const handleNodeDragEnd = (key: string) => {
    if (!dragRef.current?.moved) {
      setSelectedNode((prev) => (prev === key ? null : key));
    }
    dragRef.current = null;
  };

  // ── Flow editor handlers ──
  const addToFlow = (roleId: number) => {
    if (localSteps.length >= 4) {
      const msg = 'Maximum 4 steps allowed in the order flow';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Limit', msg);
      return;
    }
    setLocalSteps([...localSteps, { roleId, showAcceptButton: false }]);
    setFlowDirty(true);
  };

  const removeFromFlow = (index: number) => {
    const key = `step-${index}`;
    // Reconnect edges that went through this node
    const inEdge = edges.find((e) => e.to === key);
    const outEdge = edges.find((e) => e.from === key);
    setEdges((prev) => {
      let newEdges = prev.filter((e) => e.from !== key && e.to !== key);
      // Reconnect: if there was an incoming and outgoing edge, bridge them
      if (inEdge && outEdge) {
        newEdges.push({ from: inEdge.from, to: outEdge.to });
      }
      // Re-index step keys after removal
      return newEdges.map((e) => {
        const reindex = (k: string) => {
          if (!k.startsWith('step-')) return k;
          const idx = parseInt(k.split('-')[1]!);
          return `step-${idx > index ? idx - 1 : idx}`;
        };
        return { from: reindex(e.from), to: reindex(e.to) };
      });
    });
    setLocalSteps(localSteps.filter((_, i) => i !== index));
    setFlowDirty(true);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= localSteps.length) return;
    const newSteps = [...localSteps];
    [newSteps[index], newSteps[target]] = [newSteps[target]!, newSteps[index]!];
    // Swap edge references too
    const a = `step-${index}`;
    const b = `step-${target}`;
    setEdges((prev) =>
      prev.map((e) => ({
        from: e.from === a ? b : e.from === b ? a : e.from,
        to: e.to === a ? b : e.to === b ? a : e.to,
      })),
    );
    setLocalSteps(newSteps);
    setFlowDirty(true);
  };

  const toggleAccept = (index: number) => {
    setLocalSteps(
      localSteps.map((s, i) =>
        i === index ? { ...s, showAcceptButton: !s.showAcceptButton } : s,
      ),
    );
    setFlowDirty(true);
  };

  const saveFlow = async () => {
    setSaving(true);
    try {
      // Derive step order from edge connections
      const order = deriveStepOrder(edges, localSteps.length);
      const orderedSteps = order.map((i) => localSteps[i]!).filter(Boolean);
      const res = await workflowAPI.saveFlowConfig(restaurantId, orderedSteps);
      setFlowConfig(res.data);
      setFlowDirty(false);
      // Refresh notification matrix (rebuilt on save)
      const matrixRes = await notificationAPI.getSettings(restaurantId);
      setMatrix(matrixRes.data || []);
      const msg = 'Order flow saved successfully!';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
    } catch (err: any) {
      const msg = err?.message || 'Failed to save flow';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Notification toggle (saves immediately) ──
  const handleNotifToggle = async (
    triggerEvent: string,
    roleId: number,
    currentValue: boolean,
  ) => {
    // Optimistic update
    setMatrix((prev) =>
      prev.map((event) => {
        if (event.triggerEvent !== triggerEvent) return event;
        return {
          ...event,
          roles: event.roles.map((role) =>
            role.roleId !== roleId ? role : { ...role, enabled: !currentValue },
          ),
        };
      }),
    );

    try {
      await notificationAPI.updateSettings(restaurantId, [
        { triggerEvent, roleId, enabled: !currentValue },
      ]);
    } catch {
      // Revert
      setMatrix((prev) =>
        prev.map((event) => {
          if (event.triggerEvent !== triggerEvent) return event;
          return {
            ...event,
            roles: event.roles.map((role) =>
              role.roleId !== roleId ? role : { ...role, enabled: currentValue },
            ),
          };
        }),
      );
    }
  };

  // ── Role management ──
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      setCreating(true);
      await memberAPI.createRole(restaurantId, newRoleName.trim(), {});
      setNewRoleName('');
      setShowAddRole(false);
      await fetchData();
    } catch (error: any) {
      const msg = error?.message || 'Failed to create role';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await memberAPI.deleteRole(restaurantId, deleteTarget.id);
      setDeleteTarget(null);
      await fetchData();
    } catch (error: any) {
      const msg = error?.message || 'Failed to delete role';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: WHITE,
        }}>
        <ActivityIndicator size="large" color={RED} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: WHITE }}
        contentContainerStyle={{ paddingBottom: 50 }}>
        {/* ─── Header ─── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: GRAY_100,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialIcons name="arrow-back" size={22} color={GRAY_700} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: GRAY_900 }}>
                Roles & Order Flow
              </Text>
              <Text style={{ fontSize: 12, color: GRAY_500, marginTop: 2 }}>
                Configure roles and design the order pipeline
              </Text>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 1: ROLES                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="people" size={16} color={RED} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: GRAY_700,
                  letterSpacing: 0.5,
                }}>
                ROLES ({roles.length})
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddRole((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: showAddRole ? GRAY_100 : RED_LIGHT,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}>
              <MaterialIcons
                name={showAddRole ? 'close' : 'add'}
                size={15}
                color={showAddRole ? GRAY_500 : RED}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: showAddRole ? GRAY_500 : RED,
                }}>
                {showAddRole ? 'Cancel' : 'Add Role'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inline create role */}
          {showAddRole && (
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 10,
                alignItems: 'center',
              }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={newRoleName}
                  onChangeText={setNewRoleName}
                  placeholder="e.g. Barista, Host, Runner..."
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
              <Button
                title={creating ? '...' : 'Create'}
                size="sm"
                onPress={handleCreateRole}
                disabled={creating || !newRoleName.trim()}
              />
            </View>
          )}

          {/* Role list */}
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: GRAY_200,
              marginBottom: 20,
              overflow: 'hidden',
            }}>
            {roles.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <MaterialIcons name="badge" size={36} color={GRAY_400} />
                <Text
                  style={{
                    color: GRAY_500,
                    fontSize: 13,
                    marginTop: 8,
                  }}>
                  No roles yet — add one above
                </Text>
              </View>
            ) : (
              roles.map((role, i) => (
                <View key={role.id}>
                  {i > 0 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: GRAY_200,
                        marginHorizontal: 14,
                      }}
                    />
                  )}
                  <RoleListItem
                    role={role}
                    onEdit={() =>
                      router.push(ROUTES.ADMIN.ROLES.edit(id!, role.id) as any)
                    }
                    onDelete={() => setDeleteTarget(role)}
                  />
                </View>
              ))
            )}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 2: ORDER FLOW — NODE EDITOR                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
            }}>
            <MaterialIcons name="account-tree" size={16} color={RED} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: GRAY_700,
                letterSpacing: 0.5,
              }}>
              ORDER FLOW
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: GRAY_500,
              marginBottom: 12,
              lineHeight: 17,
            }}>
            Drag nodes to rearrange. Click a step to configure it.
          </Text>

          {/* Available roles toolbar */}
          {availableRoles.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: GRAY_500,
                  marginBottom: 6,
                }}>
                Add to flow:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {availableRoles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    onPress={() => addToFlow(role.id)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: BLUE_LIGHT,
                      borderWidth: 1,
                      borderColor: BLUE + '30',
                    }}>
                    <MaterialIcons name="add-circle-outline" size={16} color={BLUE} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: BLUE,
                        textTransform: 'capitalize',
                      }}>
                      {role.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Empty state */}
          {localSteps.length === 0 && (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 40,
                backgroundColor: GRAY_50,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: GRAY_200,
                borderStyle: 'dashed',
              }}>
              <MaterialIcons name="account-tree" size={48} color={GRAY_400} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: GRAY_500,
                  marginTop: 12,
                }}>
                No steps in the flow
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: GRAY_400,
                  marginTop: 4,
                  textAlign: 'center',
                  paddingHorizontal: 40,
                }}>
                Add roles above to build the order pipeline
              </Text>
            </View>
          )}

          {/* ─── Node Editor Canvas ─── */}
          {localSteps.length > 0 && (
            <View
              ref={canvasRef}
              onLayout={(e) => {
                setCanvasWidth(e.nativeEvent.layout.width);
                // Measure canvas page offset
                if (canvasRef.current && Platform.OS === 'web') {
                  const el = canvasRef.current as unknown as HTMLElement;
                  if (el.getBoundingClientRect) {
                    const rect = el.getBoundingClientRect();
                    canvasOffsetRef.current = { x: rect.left + window.scrollX, y: rect.top + window.scrollY };
                  }
                }
              }}
              onStartShouldSetResponder={() => !!wireDragFrom}
              onMoveShouldSetResponder={() => !!wireDragFrom}
              onResponderMove={(e) => handlePortDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
              onResponderRelease={(e) => handlePortDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
              style={{
                height: CANVAS_H,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: GRAY_200,
                backgroundColor: GRAY_50,
                overflow: 'hidden',
                position: 'relative',
                ...(Platform.OS === 'web'
                  ? ({
                      backgroundImage:
                        'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    } as any)
                  : {}),
              }}>
              {/* SVG Wires + clickable edge delete zones + temp drag wire */}
              {Platform.OS === 'web' &&
                createElement(
                  'div',
                  {
                    style: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                      zIndex: 1,
                    },
                  },
                  createElement(
                    'svg',
                    {
                      width: '100%',
                      height: '100%',
                      style: { display: 'block' },
                    },
                    // Existing wires
                    ...wireConnections.map((c, i) =>
                      createElement(
                        'g',
                        { key: `edge-${i}` },
                        // Invisible fat hit area for clicking to delete
                        createElement('path', {
                          d: bezierPath(c.from, c.to),
                          stroke: 'transparent',
                          strokeWidth: 18,
                          fill: 'none',
                          style: { pointerEvents: 'stroke', cursor: 'pointer' } as any,
                          onClick: () => handleEdgeClick(c.edgeIdx),
                        }),
                        // Wire glow
                        createElement('path', {
                          d: bezierPath(c.from, c.to),
                          stroke: c.color + '20',
                          strokeWidth: 10,
                          fill: 'none',
                          style: { pointerEvents: 'none' },
                        }),
                        // Wire
                        createElement('path', {
                          d: bezierPath(c.from, c.to),
                          stroke: c.color,
                          strokeWidth: 2.5,
                          fill: 'none',
                          strokeLinecap: 'round',
                          style: { pointerEvents: 'none' },
                        }),
                        // × icon at midpoint
                        createElement('circle', {
                          cx: (c.from.x + c.to.x) / 2,
                          cy: (c.from.y + c.to.y) / 2,
                          r: 8,
                          fill: WHITE,
                          stroke: c.color + '60',
                          strokeWidth: 1.5,
                          style: { pointerEvents: 'all', cursor: 'pointer' } as any,
                          onClick: () => handleEdgeClick(c.edgeIdx),
                        }),
                        createElement(
                          'text',
                          {
                            x: (c.from.x + c.to.x) / 2,
                            y: (c.from.y + c.to.y) / 2 + 3.5,
                            fill: c.color,
                            fontSize: 10,
                            fontWeight: '700',
                            textAnchor: 'middle',
                            fontFamily: 'system-ui, sans-serif',
                            style: { pointerEvents: 'none' },
                          },
                          '×',
                        ),
                        // Wire label
                        createElement(
                          'text',
                          {
                            x: (c.from.x + c.to.x) / 2,
                            y: (c.from.y + c.to.y) / 2 - 16,
                            fill: c.color,
                            fontSize: 9,
                            fontWeight: '600',
                            textAnchor: 'middle',
                            fontFamily: 'system-ui, sans-serif',
                            style: { pointerEvents: 'none' },
                          },
                          c.label,
                        ),
                      ),
                    ),
                    // Temp drag wire
                    ...(wireDragFrom && wireDragPos
                      ? [
                          createElement(
                            'g',
                            { key: 'temp-wire' },
                            createElement('path', {
                              d: bezierPath(
                                getPortPos(nodePositions[wireDragFrom] || { x: 0, y: 0 }, 'out'),
                                wireDragPos,
                              ),
                              stroke: GRAY_400,
                              strokeWidth: 2,
                              fill: 'none',
                              strokeDasharray: '6 4',
                              strokeLinecap: 'round',
                              style: { pointerEvents: 'none' },
                            }),
                            createElement('circle', {
                              cx: wireDragPos.x,
                              cy: wireDragPos.y,
                              r: 5,
                              fill: GRAY_400,
                              style: { pointerEvents: 'none' },
                            }),
                          ),
                        ]
                      : []),
                  ),
                )}

              {/* Start node — Customer Order */}
              <View
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) =>
                  handleNodeDragStart('start', e.nativeEvent.pageX, e.nativeEvent.pageY)
                }
                onResponderMove={(e) =>
                  handleNodeDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)
                }
                onResponderRelease={() => handleNodeDragEnd('start')}
                style={{
                  position: 'absolute',
                  left: nodePositions['start']?.x ?? 0,
                  top: nodePositions['start']?.y ?? 0,
                  width: NODE_W,
                  height: NODE_H,
                  zIndex: selectedNode === 'start' ? 10 : 2,
                  ...(Platform.OS === 'web'
                    ? ({ cursor: 'grab', userSelect: 'none' } as any)
                    : {}),
                }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: selectedNode === 'start' ? BLUE : BLUE_LIGHT,
                    borderWidth: 2,
                    borderColor: selectedNode === 'start' ? BLUE : BLUE + '40',
                    ...(Platform.OS === 'web'
                      ? ({
                          boxShadow:
                            selectedNode === 'start'
                              ? `0 0 0 3px ${BLUE}30`
                              : '0 2px 8px rgba(0,0,0,0.06)',
                        } as any)
                      : {}),
                  }}>
                  <MaterialIcons
                    name="person"
                    size={18}
                    color={selectedNode === 'start' ? WHITE : BLUE}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: selectedNode === 'start' ? WHITE : BLUE,
                    }}>
                    Customer Order
                  </Text>
                </View>
                {/* Output port — draggable to create wire */}
                <View
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    e.stopPropagation?.();
                    handlePortDragStart('start', 'out', e.nativeEvent.pageX, e.nativeEvent.pageY);
                  }}
                  onResponderMove={(e) => handlePortDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                  onResponderRelease={(e) => handlePortDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                  style={{
                    position: 'absolute',
                    right: -12,
                    top: NODE_H / 2 - 12,
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                    ...(Platform.OS === 'web' ? ({ cursor: 'crosshair' } as any) : {}),
                  }}>
                  <View
                    style={{
                      width: PORT_R * 2 + 2,
                      height: PORT_R * 2 + 2,
                      borderRadius: PORT_R + 1,
                      backgroundColor: STATUS_COLORS['received'] || BLUE,
                      borderWidth: 2,
                      borderColor: WHITE,
                    }}
                  />
                </View>
              </View>

              {/* Step nodes */}
              {computedSteps.map((step, i) => {
                const key = `step-${i}`;
                const pos = nodePositions[key];
                if (!pos) return null;
                const isSelected = selectedNode === key;
                const entryColor = STATUS_COLORS[step.entryStatus] || GRAY_500;
                const exitColor = STATUS_COLORS[step.exitStatus] || GRAY_500;
                const icon = getRoleIcon(step.roleName);

                return (
                  <View
                    key={key}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={(e) =>
                      handleNodeDragStart(key, e.nativeEvent.pageX, e.nativeEvent.pageY)
                    }
                    onResponderMove={(e) =>
                      handleNodeDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)
                    }
                    onResponderRelease={() => handleNodeDragEnd(key)}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                      width: NODE_W,
                      height: NODE_H,
                      zIndex: isSelected ? 10 : 2,
                      ...(Platform.OS === 'web'
                        ? ({ cursor: 'grab', userSelect: 'none' } as any)
                        : {}),
                    }}>
                    <View
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        backgroundColor: WHITE,
                        borderWidth: 2,
                        borderColor: isSelected ? RED : GRAY_200,
                        overflow: 'hidden',
                        ...(Platform.OS === 'web'
                          ? ({
                              boxShadow: isSelected
                                ? `0 0 0 3px ${RED}25`
                                : '0 2px 8px rgba(0,0,0,0.06)',
                            } as any)
                          : {}),
                      }}>
                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          gap: 8,
                        }}>
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            backgroundColor: RED_LIGHT,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <MaterialIcons name={icon} size={16} color={RED} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: GRAY_900,
                              textTransform: 'capitalize',
                            }}>
                            {step.roleName}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                              marginTop: 2,
                            }}>
                            <View
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: entryColor,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 8,
                                color: entryColor,
                                fontWeight: '600',
                              }}>
                              {step.entryStatusLabel}
                            </Text>
                            <MaterialIcons
                              name="arrow-forward"
                              size={8}
                              color={GRAY_400}
                            />
                            <View
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: exitColor,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 8,
                                color: exitColor,
                                fontWeight: '600',
                              }}>
                              {step.exitStatusLabel}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Input port — draggable to disconnect & rewire */}
                      <View
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={(e) => {
                          e.stopPropagation?.();
                          handlePortDragStart(key, 'in', e.nativeEvent.pageX, e.nativeEvent.pageY);
                        }}
                        onResponderMove={(e) => handlePortDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                        onResponderRelease={(e) => handlePortDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                        style={{
                          position: 'absolute',
                          left: -12,
                          top: NODE_H / 2 - 12,
                          width: 24,
                          height: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 20,
                          ...(Platform.OS === 'web' ? ({ cursor: 'crosshair' } as any) : {}),
                        }}>
                        <View
                          style={{
                            width: PORT_R * 2 + 2,
                            height: PORT_R * 2 + 2,
                            borderRadius: PORT_R + 1,
                            backgroundColor: entryColor,
                            borderWidth: 2,
                            borderColor: WHITE,
                          }}
                        />
                      </View>
                      {/* Output port — draggable to create wire */}
                      <View
                        onStartShouldSetResponder={() => true}
                        onResponderGrant={(e) => {
                          e.stopPropagation?.();
                          handlePortDragStart(key, 'out', e.nativeEvent.pageX, e.nativeEvent.pageY);
                        }}
                        onResponderMove={(e) => handlePortDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                        onResponderRelease={(e) => handlePortDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                        style={{
                          position: 'absolute',
                          right: -12,
                          top: NODE_H / 2 - 12,
                          width: 24,
                          height: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 20,
                          ...(Platform.OS === 'web' ? ({ cursor: 'crosshair' } as any) : {}),
                        }}>
                        <View
                          style={{
                            width: PORT_R * 2 + 2,
                            height: PORT_R * 2 + 2,
                            borderRadius: PORT_R + 1,
                            backgroundColor: exitColor,
                            borderWidth: 2,
                            borderColor: WHITE,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* End node — Order Complete */}
              <View
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) =>
                  handleNodeDragStart('end', e.nativeEvent.pageX, e.nativeEvent.pageY)
                }
                onResponderMove={(e) =>
                  handleNodeDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)
                }
                onResponderRelease={() => handleNodeDragEnd('end')}
                style={{
                  position: 'absolute',
                  left: nodePositions['end']?.x ?? 0,
                  top: nodePositions['end']?.y ?? 0,
                  width: NODE_W,
                  height: NODE_H,
                  zIndex: selectedNode === 'end' ? 10 : 2,
                  ...(Platform.OS === 'web'
                    ? ({ cursor: 'grab', userSelect: 'none' } as any)
                    : {}),
                }}>
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    backgroundColor: selectedNode === 'end' ? GREEN : GREEN_LIGHT,
                    borderWidth: 2,
                    borderColor: selectedNode === 'end' ? GREEN : GREEN + '40',
                    ...(Platform.OS === 'web'
                      ? ({
                          boxShadow:
                            selectedNode === 'end'
                              ? `0 0 0 3px ${GREEN}30`
                              : '0 2px 8px rgba(0,0,0,0.06)',
                        } as any)
                      : {}),
                  }}>
                  <MaterialIcons
                    name="check-circle"
                    size={18}
                    color={selectedNode === 'end' ? WHITE : GREEN}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: selectedNode === 'end' ? WHITE : GREEN,
                    }}>
                    Order Complete
                  </Text>
                </View>
                {/* Input port — draggable to disconnect & rewire */}
                <View
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={(e) => {
                    e.stopPropagation?.();
                    handlePortDragStart('end', 'in', e.nativeEvent.pageX, e.nativeEvent.pageY);
                  }}
                  onResponderMove={(e) => handlePortDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                  onResponderRelease={(e) => handlePortDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
                  style={{
                    position: 'absolute',
                    left: -12,
                    top: NODE_H / 2 - 12,
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                    ...(Platform.OS === 'web' ? ({ cursor: 'crosshair' } as any) : {}),
                  }}>
                  <View
                    style={{
                      width: PORT_R * 2 + 2,
                      height: PORT_R * 2 + 2,
                      borderRadius: PORT_R + 1,
                      backgroundColor: STATUS_COLORS['paid'] || GREEN,
                      borderWidth: 2,
                      borderColor: WHITE,
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Wire hint */}
          {localSteps.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
                paddingHorizontal: 4,
              }}>
              <MaterialIcons name="info-outline" size={12} color={GRAY_400} />
              <Text style={{ fontSize: 10, color: GRAY_400, flex: 1 }}>
                Drag ports (●) to connect nodes. Click × on a wire to disconnect.
              </Text>
            </View>
          )}

          {/* ─── Selected Node Settings Panel ─── */}
          {selectedNode?.startsWith('step-') &&
            (() => {
              const idx = parseInt(selectedNode.split('-')[1]!);
              const step = computedSteps[idx];
              if (!step) return null;
              const matrixEvent = matrixByEvent.get(step.triggerEvent);

              return (
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: RED + '30',
                    backgroundColor: WHITE,
                    overflow: 'hidden',
                  }}>
                  {/* Panel header */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      backgroundColor: GRAY_50,
                      borderBottomWidth: 1,
                      borderBottomColor: GRAY_200,
                      gap: 8,
                    }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: RED_LIGHT,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <MaterialIcons name={getRoleIcon(step.roleName)} size={16} color={RED} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '700',
                          color: GRAY_900,
                          textTransform: 'capitalize',
                        }}>
                        {step.roleName}
                      </Text>
                      <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 1 }}>
                        Step {idx + 1} of {computedSteps.length}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {idx > 0 && (
                        <TouchableOpacity
                          onPress={() => moveStep(idx, 'up')}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: GRAY_100,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <MaterialIcons name="arrow-upward" size={14} color={GRAY_500} />
                        </TouchableOpacity>
                      )}
                      {idx < computedSteps.length - 1 && (
                        <TouchableOpacity
                          onPress={() => moveStep(idx, 'down')}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: GRAY_100,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <MaterialIcons name="arrow-downward" size={14} color={GRAY_500} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          removeFromFlow(idx);
                          setSelectedNode(null);
                        }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          backgroundColor: '#FEE2E2',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <MaterialIcons name="close" size={14} color={RED} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Status flow */}
                  <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: (STATUS_COLORS[step.entryStatus] || GRAY_500) + '15',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: STATUS_COLORS[step.entryStatus] || GRAY_500,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: STATUS_COLORS[step.entryStatus] || GRAY_500,
                          }}>
                          {step.entryStatusLabel}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-forward" size={14} color={GRAY_400} />
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: (STATUS_COLORS[step.exitStatus] || GRAY_500) + '15',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: STATUS_COLORS[step.exitStatus] || GRAY_500,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: STATUS_COLORS[step.exitStatus] || GRAY_500,
                          }}>
                          {step.exitStatusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Accept button toggle */}
                  <TouchableOpacity
                    onPress={() => toggleAccept(idx)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      marginHorizontal: 14,
                      marginTop: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: step.showAcceptButton ? GREEN_LIGHT : GRAY_50,
                      borderWidth: 1,
                      borderColor: step.showAcceptButton ? GREEN + '30' : GRAY_200,
                    }}>
                    <MaterialIcons
                      name={step.showAcceptButton ? 'check-box' : 'check-box-outline-blank'}
                      size={18}
                      color={step.showAcceptButton ? GREEN : GRAY_400}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: step.showAcceptButton ? GREEN : GRAY_500,
                        flex: 1,
                      }}>
                      Show Accept Button
                    </Text>
                    {step.showAcceptButton && (
                      <View
                        style={{
                          backgroundColor: GREEN + '15',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: GREEN }}>
                          ACTIVE
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Notification toggles */}
                  <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: GRAY_500,
                        marginBottom: 6,
                      }}>
                      Notify when order arrives here:
                    </Text>
                    {matrixEvent ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {matrixEvent.roles.map((role) => (
                          <TouchableOpacity
                            key={role.roleId}
                            onPress={() =>
                              handleNotifToggle(
                                matrixEvent.triggerEvent,
                                role.roleId,
                                role.enabled,
                              )
                            }
                            activeOpacity={0.7}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 20,
                              backgroundColor: role.enabled ? AMBER_LIGHT : GRAY_50,
                              borderWidth: 1,
                              borderColor: role.enabled ? AMBER + '40' : GRAY_200,
                            }}>
                            <MaterialIcons
                              name={getRoleIcon(role.roleName)}
                              size={12}
                              color={role.enabled ? AMBER : GRAY_400}
                            />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: role.enabled ? '700' : '500',
                                color: role.enabled ? GRAY_900 : GRAY_500,
                                textTransform: 'capitalize',
                              }}>
                              {role.roleName}
                            </Text>
                            <MaterialIcons
                              name={
                                role.enabled ? 'notifications-active' : 'notifications-off'
                              }
                              size={11}
                              color={role.enabled ? AMBER : GRAY_400}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: GRAY_400, fontStyle: 'italic' }}>
                        Save flow first to configure notifications
                      </Text>
                    )}
                  </View>
                </View>
              );
            })()}

          {/* Save button */}
          {localSteps.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Button
                title={saving ? 'Saving…' : flowDirty ? 'Save Flow' : 'Flow Saved ✓'}
                onPress={saveFlow}
                disabled={!flowDirty || saving}
                loading={saving}
                size="lg"
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}" role?</DialogTitle>
            <DialogDescription>
              This will:{'\n'}
              • Remove this role from all staff members{'\n'}
              • Remove all notification settings for this role{'\n\n'}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => setDeleteTarget(null)}
            />
            <Button
              title={deleting ? 'Deleting...' : 'Delete Role'}
              variant="danger"
              size="sm"
              onPress={handleDelete}
              disabled={deleting}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
