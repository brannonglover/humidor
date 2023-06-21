import { StyleSheet, View, Text } from 'react-native';

function Favorites() {
  return (
    <View>
      <Text>Favorites</Text>
    </View>
  );
}

export default Favorites;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  mainTitle: {
    fontFamily: 'Verdana',
    fontSize: 25,
    textAlign: 'center'
  }
});
