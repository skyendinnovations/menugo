import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { memberAPI, type Member, type Role } from '@/lib/api';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

/* ── Theme tokens ─────────────────────────────────────────────── */
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';
const GRAY_900 = '#111827';
const GRAY_700 = '#374151';
const GRAY_500 = '#6B7280';
const GRAY_400 = '#9CA3AF';
const GRAY_200 = '#E5E7EB';
const GRAY_50 = '#F9FAFB';
const WHITE = '#FFFFFF';
const PURPLE = '#8B5CF6';
const PURPLE_LIGHT = '#F5F3FF';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const restaurantId = Number(id);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const [membersRes, rolesRes] = await Promise.all([
        memberAPI.getMembers(restaurantId),
        memberAPI.getRoles(restaurantId),
      ]);
      setMembers(membersRes.data || []);
      setRoles((rolesRes.data || []).filter((r: Role) => r.name.toLowerCase() !== 'owner'));
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  const handleRemove = async (memberId: number) => {
    try {
      await memberAPI.removeMember(restaurantId, memberId);
      fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const openRoleEditor = (member: Member) => {
    setEditingMember(member);
    setSelectedRoleIds(member.roles?.map((r) => r.roleId) || []);
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSaveRoles = async () => {
    if (!editingMember || selectedRoleIds.length === 0) return;
    try {
      setSaving(true);
      await memberAPI.updateMemberRoles(restaurantId, editingMember.userId, selectedRoleIds);
      setEditingMember(null);
      fetchMembers();
    } catch (error) {
      console.error('Failed to update roles:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: WHITE }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: GRAY_200,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: GRAY_200,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: WHITE,
              }}>
              <Ionicons name="arrow-back" size={20} color={GRAY_700} />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: GRAY_900 }}>Members</Text>
              <Text style={{ fontSize: 13, color: GRAY_500 }}>
                {members.length} member{members.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push(`/(admin)/restaurants/${id}/members/invite` as any)}
            activeOpacity={0.85}
            style={{
              backgroundColor: RED,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              ...Platform.select({
                ios: { shadowColor: RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
                android: { elevation: 4 },
                default: { boxShadow: '0 3px 10px rgba(220,38,38,0.2)' } as any,
              }),
            }}>
            <Ionicons name="person-add" size={16} color={WHITE} />
            <Text style={{ color: WHITE, fontSize: 14, fontWeight: '600' }}>Invite</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={RED} />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 40,
              maxWidth: 600,
              width: '100%',
              alignSelf: 'center' as any,
            }}
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: WHITE,
                  borderWidth: 1.5,
                  borderColor: GRAY_200,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {/* Avatar */}
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      backgroundColor: RED_LIGHT,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: RED }}>
                      {getInitials(item.userName)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: GRAY_900 }}>{item.userName}</Text>
                    <Text style={{ fontSize: 13, color: GRAY_500, marginTop: 2 }}>{item.userEmail}</Text>
                    {/* Roles */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {item.isOwner && (
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: RED_LIGHT,
                          }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: RED }}>Owner</Text>
                        </View>
                      )}
                      {item.roles
                        ?.filter((r) => !(item.isOwner && r.roleName.toLowerCase() === 'owner'))
                        .map((r) => (
                          <View
                            key={r.roleId}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 3,
                              borderRadius: 8,
                              backgroundColor: PURPLE_LIGHT,
                              borderWidth: 1,
                              borderColor: '#E9D5FF',
                            }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: PURPLE }}>
                              {r.roleName}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                </View>
                {!item.isOwner && (
                  <View style={{ flexDirection: 'column', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => openRoleEditor(item)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: PURPLE_LIGHT,
                        borderWidth: 1,
                        borderColor: '#E9D5FF',
                      }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: PURPLE }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemove(item.id)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: RED_LIGHT,
                        borderWidth: 1,
                        borderColor: '#FECACA',
                      }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: RED }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    backgroundColor: GRAY_50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                  <MaterialIcons name="people-outline" size={36} color={GRAY_400} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: GRAY_500 }}>No members yet</Text>
                <Text style={{ fontSize: 14, color: GRAY_400, marginTop: 4 }}>
                  Invite staff to get started
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Role Editor Modal */}
      <Modal
        visible={!!editingMember}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMember(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}>
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 18,
              width: '100%',
              maxWidth: 420,
              maxHeight: '80%',
              ...Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
                android: { elevation: 12 },
                default: { boxShadow: '0 8px 32px rgba(0,0,0,0.15)' } as any,
              }),
            }}>
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: GRAY_200,
              }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: GRAY_900 }}>Edit Roles</Text>
                {editingMember && (
                  <Text style={{ fontSize: 13, color: GRAY_500, marginTop: 2 }}>
                    {editingMember.userName}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setEditingMember(null)}
                activeOpacity={0.7}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: GRAY_50,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="close" size={20} color={GRAY_500} />
              </TouchableOpacity>
            </View>

            {/* Role Checkboxes */}
            <ScrollView style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
              {roles.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ fontSize: 14, color: GRAY_500 }}>No roles available</Text>
                  <Text style={{ fontSize: 12, color: GRAY_400, marginTop: 4 }}>
                    Create roles in the Roles tab first
                  </Text>
                </View>
              ) : (
                roles.map((role) => {
                  const selected = selectedRoleIds.includes(role.id);
                  return (
                    <TouchableOpacity
                      key={role.id}
                      onPress={() => toggleRole(role.id)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        backgroundColor: selected ? PURPLE_LIGHT : WHITE,
                        borderWidth: 1.5,
                        borderColor: selected ? '#D8B4FE' : GRAY_200,
                        marginBottom: 10,
                        gap: 12,
                      }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          borderWidth: 2,
                          borderColor: selected ? PURPLE : GRAY_400,
                          backgroundColor: selected ? PURPLE : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        {selected && <Ionicons name="checkmark" size={16} color={WHITE} />}
                      </View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '600',
                          color: selected ? PURPLE : GRAY_700,
                        }}>
                        {role.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: 1,
                borderTopColor: GRAY_200,
              }}>
              <TouchableOpacity
                onPress={() => setEditingMember(null)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: GRAY_200,
                  alignItems: 'center',
                }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: GRAY_700 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveRoles}
                disabled={saving || selectedRoleIds.length === 0}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: selectedRoleIds.length === 0 ? GRAY_200 : RED,
                  alignItems: 'center',
                  ...Platform.select({
                    ios: { shadowColor: RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
                    android: { elevation: 4 },
                    default: { boxShadow: '0 3px 10px rgba(220,38,38,0.2)' } as any,
                  }),
                }}>
                {saving ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: selectedRoleIds.length === 0 ? GRAY_400 : WHITE,
                    }}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
