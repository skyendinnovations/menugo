import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';

interface ImageUploadProps {
  /** URL or local URI to display */
  value?: string | null;
  /** Called with the local URI when image is picked, or null when removed */
  onChange?: (uri: string | null) => void;
  size?: number;
  shape?: 'square' | 'circle';
}

export function ImageUpload({ value, onChange, size = 120, shape = 'square' }: ImageUploadProps) {
  const [showOptions, setShowOptions] = useState(false);

  const handlePickImage = useCallback(async () => {
    setShowOptions(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      onChange?.(result.assets[0].uri);
    }
  }, [onChange]);

  const handleTakePhoto = useCallback(async () => {
    setShowOptions(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      onChange?.(result.assets[0].uri);
    }
  }, [onChange]);

  const handleRemove = useCallback(() => {
    setShowOptions(false);
    onChange?.(null);
  }, [onChange]);

  const borderRadius = shape === 'circle' ? size / 2 : 12;

  return (
    <View className="items-center">
      <TouchableOpacity
        onPress={() => setShowOptions(true)}
        activeOpacity={0.7}
        style={{
          width: size,
          height: size,
          borderRadius,
          overflow: 'hidden',
        }}
        className="items-center justify-center border-2 border-dashed border-slate-600 bg-slate-800">
        {value ? (
          <Image
            source={{ uri: value }}
            style={{ width: size, height: size, borderRadius }}
            resizeMode="cover"
          />
        ) : (
          <View className="items-center gap-1">
            <MaterialIcons name="add-a-photo" size={28} color="#64748B" />
            <Text className="text-xs text-slate-500">Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setShowOptions(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-2xl bg-slate-800 px-5 pb-8 pt-4">
            <View className="mb-5 h-1 w-10 self-center rounded-full bg-slate-600" />

            <TouchableOpacity
              onPress={handlePickImage}
              className="flex-row items-center gap-4 py-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
                <MaterialIcons name="photo-library" size={22} color="#F97316" />
              </View>
              <Text className="text-base font-medium text-white">Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTakePhoto}
              className="flex-row items-center gap-4 py-4">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand/15">
                <MaterialIcons name="camera-alt" size={22} color="#F97316" />
              </View>
              <Text className="text-base font-medium text-white">Take a Photo</Text>
            </TouchableOpacity>

            {value && (
              <TouchableOpacity onPress={handleRemove} className="flex-row items-center gap-4 py-4">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
                  <MaterialIcons name="delete" size={22} color="#EF4444" />
                </View>
                <Text className="text-base font-medium text-red-400">Remove Image</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowOptions(false)}
              className="mt-2 items-center py-3">
              <Text className="text-base text-slate-400">Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
