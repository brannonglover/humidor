import { useState } from 'react';
import {
  ApolloProvider, ApolloClient, InMemoryCache
} from '@apollo/client';
import { StyleSheet, Text, SafeAreaView, View, FlatList } from 'react-native';
import AddCigarBtn from './components/AddCigarBtn'
import AddFaveCigar from './components/AddFaveCigar';
import CigarList from './components/CigarList';

const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache()
});

function App() {
  const [addFaveCigar, setAddFaveCigar] = useState(false);
  
  return (
    <ApolloProvider client={client}>
      <SafeAreaView style={addFaveCigar ? styles.modalBg : ""}>
        <Text style={styles.mainTitle}>My Cigars</Text>
        <CigarList />
      </SafeAreaView>
      <AddCigarBtn bgColor='red' shape='round' setAddFaveCigar={setAddFaveCigar} />
      {addFaveCigar && <AddFaveCigar toggleAddWindow={setAddFaveCigar} />}
    </ApolloProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  mainTitle: {
    fontFamily: 'Verdana',
    fontSize: 25,
    textAlign: 'center'
  },
  modalBg: {
    backgroundColor: 'rgba(0,0,0,.5)',
    height: '100%'
  }
});
