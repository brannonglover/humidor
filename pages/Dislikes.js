import { StyleSheet, View, Text } from 'react-native';

function Dislikes() {
  return (
    <View>
      <Text>Dislikes</Text>
    </View>
  );
}

export default Dislikes;

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
