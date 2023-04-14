import { Text, View, Pressable, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

function AddCigarBtn({ setAddFaveCigar }) {
  return (
    <Pressable style={[styles.btnContainer, styles.boxShadow]} onPress={setAddFaveCigar}>
      <View style={styles.btnIconContainer}>
        <FontAwesomeIcon icon={faPlus} size={30} color={'#fff'} />
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
    backgroundColor: 'red',
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