import { View, StyleSheet, Text, SafeAreaView, Pressable, Alert } from 'react-native';
import AddCigarBtn from '../components/AddCigarBtn';
import CigarList from '../components/CigarList';
import FeedbackBtn from '../components/FeedbackBtn';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

function Humidor({ navigation }) {
  const view = 'humidor';
  const { user, supabase } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase?.auth.signOut() },
    ]);
  };

  return (
    <>
      <View style={styles.screen}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Humidor</Text>
              <Text style={styles.subtitle}>Your collection</Text>
            </View>
            <View style={styles.headerRight}>
              <FeedbackBtn />
              {user && (
                <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
                  <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
              )}
            </View>
          </View>
          <CigarList view={view} onEditCigar={(cigar) => navigation.navigate('EditCigar', { cigar })} />
        </SafeAreaView>
      </View>
      <AddCigarBtn onPress={() => navigation.navigate('AddCigar')} />
    </>
  );
}

export default Humidor;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  signOutBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  signOutText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
