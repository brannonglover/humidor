import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DatePickerField from './DatePickerField';
import colors from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FavoriteNotesModal({
  visible,
  cigar,
  initialNotes = {},
  mode = 'add',
  onSave,
  onCancel,
}) {
  const [smokedDate, setSmokedDate] = useState('');
  const [rating, setRating] = useState(0);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setSmokedDate(initialNotes.smoked_date ?? '');
      setRating(0);
    }
  }, [visible, initialNotes]);

  useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onCancel());
  };

  const handleSave = () => {
    const notes = {
      favorite_notes: initialNotes.favorite_notes ?? null,
      flavor_profile: initialNotes.flavor_profile ?? null,
      flavor_changes: initialNotes.flavor_changes ?? null,
      construction_quality: initialNotes.construction_quality ?? null,
      smoked_date: smokedDate.trim(),
      rating: rating > 0 ? rating : null,
    };
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onSave(notes));
  };

  if (!cigar) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
            pointerEvents="none"
          />
        </Pressable>
        <KeyboardAvoidingView
          style={styles.sheetWrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
            <Text style={styles.title}>{mode === 'edit' ? 'Update favorite' : 'Add to favorites'}</Text>
            <Text style={styles.subtitle}>
              {cigar.brand ?? ''} · {cigar.name ?? ''}
            </Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={Platform.OS === 'android'}
            >
              <DatePickerField
                label="Date smoked"
                value={smokedDate}
                onChange={setSmokedDate}
                placeholder="Tap to pick date"
                optional={true}
              />

              <Text style={styles.label}>Rate it (tap a star to share with community)</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setRating((prev) => (prev === n ? 0 : n))}
                    style={styles.ratingStar}
                  >
                    <MaterialCommunityIcons
                      name={n <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color={n <= rating ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 50,
  },
  sheet: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingTop: 4,
    marginBottom: 16,
  },
  scroll: {
    flexGrow: 1,
    minHeight: 180,
    maxHeight: 280,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 17,
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.screenBg,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  ratingStar: {
    padding: 4,
  },
});
