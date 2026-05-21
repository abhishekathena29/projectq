import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { NavigationProvider } from "../../contexts/NavigationContext";

import CaregiverDashboard from "./CaregiverDashboard";
import ChildMode from "./ChildMode";
import InviteScreen from "./InviteScreen";
import ProgressScreen from "./ProgressScreen";
import ScheduleBuilder from "./ScheduleBuilder";
import TeacherDashboard from "./TeacherDashboard";
import LoginRegister from "./index";

import { auth } from "../../config/firebase";
import { Colors } from "../../constants/Colors";
import { useColorScheme } from "../../hooks/useColorScheme";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const db = getFirestore();

/* ---------------------- Caregiver Tabs ---------------------- */
const CaregiverTabs = () => {
  const colorScheme = useColorScheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "CaregiverDashboard") {
            iconName = focused ? "information-circle" : "information-circle-outline";
          } else if (route.name === "ProgressScreen") {
            iconName = focused ? "trending-up" : "trending-up-outline";
          } else if (route.name === "ScheduleBuilder") {
            iconName = focused ? "calendar" : "calendar-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CaregiverDashboard" component={CaregiverDashboard} />
      <Tab.Screen name="ProgressScreen" component={ProgressScreen} />
      <Tab.Screen name="ScheduleBuilder" component={ScheduleBuilder} />
    </Tab.Navigator>
  );
};

/* ---------------------- Teacher Tabs ---------------------- */
const TeacherTabs = () => {
  const colorScheme = useColorScheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
           if (route.name === "ProgressScreen") {
            iconName = focused ? "trending-up" : "trending-up-outline";
          } else if (route.name === "TeacherDashboard") {
            iconName = focused ? "school" : "school-outline";
          } else if (route.name === "ScheduleBuilder") {
            iconName = focused ? "calendar" : "calendar-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="TeacherDashboard" component={TeacherDashboard} />
      <Tab.Screen name="ScheduleBuilder" component={ScheduleBuilder} />
    </Tab.Navigator>
  );
};

/* ---------------------- Child Tabs ---------------------- */
const ChildTabs = () => {
  const colorScheme = useColorScheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
        tabBarIcon: ({ focused, color, size }) => {
          // Use a valid Ionicons name for the child tab
          const iconName = focused ? "happy" : "happy-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ChildMode" component={ChildMode} />
    </Tab.Navigator>
  );
};

/* ---------------------- Drawer Navigator ---------------------- */
const DrawerNavigator = ({ role }) => {
  const navigation = useNavigation();

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigation.replace("LoginRegister");
      })
      .catch((err) => {
        console.error("Logout Error:", err);
        Alert.alert("Error", "Failed to logout. Please try again.");
      });
  };

  // Decide which tabs to render based on role
  const getMainTabs = () => {
    if (role === "teacher") return TeacherTabs;
    if (role === "caregiver") return CaregiverTabs;
    if (role === "child") return ChildTabs;
    
    // Default fallback - return CaregiverTabs if role is null/undefined
    return CaregiverTabs;
  };

  // Show loading if role is still being determined
  if (role === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Drawer.Navigator initialRouteName="MainTabs">
      <Drawer.Screen
        name="MainTabs"
        component={getMainTabs()}
        options={{ title: "Home" }}
      />

      {/* ✅ Invite Screen accessible via drawer - Only for caregivers */}
      {role === "caregiver" && (
        <Drawer.Screen
          name="InviteScreen"
          component={InviteScreen}
          options={{
            title: "Invite",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="person-add-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      <Drawer.Screen
        name="Logout"
        component={View} // dummy component
        options={{
          title: "Logout",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="log-out-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          drawerItemPress: (e) => {
            e.preventDefault();
            handleLogout();
          },
        }}
      />
    </Drawer.Navigator>
  );
};

/* ---------------------- Main Stack Layout ---------------------- */
export default function StackLayout() {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          } else {
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching role:", error);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].background,
          },
        }}
      >
        {user ? (
          <Stack.Screen name="Drawer">
            {() => <DrawerNavigator role={role} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="LoginRegister" component={LoginRegister} />
        )}
      </Stack.Navigator>
    </NavigationProvider>
  );
}
