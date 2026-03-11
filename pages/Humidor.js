import { View, StyleSheet, Text, SafeAreaView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AddCigarBtn from '../components/AddCigarBtn';
import AccountMenu from '../components/AccountMenu';
import CigarList from '../components/CigarList';
import FeedbackBtn from '../components/FeedbackBtn';
import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

function Humidor({ navigation }) {
  const view = 'humidor';
  const { user, supabase } = useAuth();

  return (
    <>
      <View style={styles.screen}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={require('../assets/logo-wo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.subtitle}>Your collection</Text>
            </View>
            <View style={styles.headerRight}>
              <FeedbackBtn />
              {user && (
                <AccountMenu onSignOut={() => supabase?.auth.signOut()}>
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={24}
                    color={colors.textSecondary}
                  />
                </AccountMenu>
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
    justifyContent: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  logo: {
    height: 40,
    width: 74,
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
    marginLeft: 'auto',
  },
});
