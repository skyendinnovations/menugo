import { Button } from "@/components/ui/Button";
import { authAPI } from "@/lib/api";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export default function UserHomePage() {
    const router = useRouter();

  return (
    // Your user home page content
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Welcome, User!</Text>
      <Button title="Sign out" onPress={() => {
        authAPI.signOut(router);
      }} />
    </View>
  );
}