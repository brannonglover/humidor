import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Image, StyleSheet } from "react-native-web";
import Humidor from '../pages/Humidor'
import Favorites from '../pages/Favorites'
import Dislikes from '../pages/Dislikes'
import dislikes from '../assets/dislikes.png';
import likes from '../assets/great-cigar.png'
import humidor from '../assets/humidor_icon.png';

const Tab = createBottomTabNavigator()

export function ActionButtons() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#778BA9',
          height: '60px',
        },
        headerShown: false
      }}
    >
      <Tab.Screen
        name="Humidor"
        component={Humidor}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{alignItems: 'center', justifyContent: 'center'}}>
              <Image
                source={humidor}
                resizeMode="contain"
                style={{
                  width: '2.5rem',
                  height: '2.5rem'
                }}
              />
            </View>
          )
        }}
      />
      <Tab.Screen name="Favorites" component={Favorites} options={{
        tabBarIcon: ({ focused }) => (
          <View style={{alignItems: 'center', justifyContent: 'center'}}>
            <Image
              source={likes}
              resizeMode="contain"
              style={{
                width: '3.5rem',
                height: '3.5rem'
              }}
            />
          </View>
        )
      }} />
      <Tab.Screen name="Dislikes" component={Dislikes} options={{
        tabBarIcon: ({ focused }) => (
          <View style={{alignItems: 'center', justifyContent: 'center'}}>
            <Image
              source={dislikes}
              resizeMode="contain"
              style={{
                width: '2.5rem',
                height: '2.5rem'
              }}
            />
          </View>
        )
      }} />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#5d5039',
    position: 'absolute',
    bottom: '0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: '.5rem'
  },
  boxes: {
    alignItems: 'center',
  },
});