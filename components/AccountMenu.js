import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';

const DROPDOWN_WIDTH = 160;
const DROPDOWN_PADDING = 8;

export default function AccountMenu({ onSignOut, children }) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const triggerRef = useRef(null);

  const open = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPosition({ x, y, width, height });
      setVisible(true);
    });
  };

  const close = () => setVisible(false);

  const handleSignOut = () => {
    close();
    onSignOut?.();
  };

  const screenWidth = Dimensions.get('window').width;
  const dropdownLeft = Math.min(
    Math.max(position.x + position.width - DROPDOWN_WIDTH, DROPDOWN_PADDING),
    screenWidth - DROPDOWN_WIDTH - DROPDOWN_PADDING
  );
  const dropdownTop = position.y + position.height + 4;

  return (
    <>
      <Pressable ref={triggerRef} onPress={open} style={styles.trigger}>
        {children}
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.overlay} onPress={close}>
          <View
            style={[
              styles.dropdown,
              {
                left: dropdownLeft,
                top: dropdownTop,
              },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={handleSignOut}
              android_ripple={{ color: colors.borderLight }}
            >
              <MaterialCommunityIcons
                name="logout"
                size={20}
                color={colors.dislike}
                style={styles.menuIcon}
              />
              <Text style={styles.menuItemTextDestructive}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    width: DROPDOWN_WIDTH,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuIcon: {
    marginRight: 10,
  },
  menuItemTextDestructive: {
    fontSize: 16,
    color: colors.dislike,
    fontWeight: '500',
  },
});
