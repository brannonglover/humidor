import { Text, View, Pressable, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

function AddCigarBtn({ setAddFaveCigar }) {
  return (
    <Pressable style={[styles.btnContainer, styles.boxShadow]} onPress={setAddFaveCigar}>
      <View style={styles.btnIconContainer}>
        <AntDesign name="pluscircle" size={51} color="red" iconStyle="#fff" />
      </View>
    </Pressable>
  )
}

export default AddCigarBtn;

const styles = StyleSheet.create({
  btnContainer: {
    borderRadius: 50,
    height: 50,
    width: 50,
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  boxShadow: {
    shadowColor: 'black',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: .3,
  },
  btnIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  }
});