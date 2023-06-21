import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
} from '@apollo/client';
import { NavigationContainer } from '@react-navigation/native'
import { ActionButtons } from './components/ActionButtons';

const client = new ApolloClient({
  uri: 'http://localhost:5000/graphql',
  cache: new InMemoryCache()
});

function App() {
  return (
    <NavigationContainer>
      <ApolloProvider client={client}>
        <ActionButtons />
      </ApolloProvider>
    </NavigationContainer>
  );
}

export default App;