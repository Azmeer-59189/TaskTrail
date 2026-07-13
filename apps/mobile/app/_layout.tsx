import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#F7F8F5" },
        headerTintColor: "#172026",
        headerTitleStyle: { fontWeight: "700" },
      }}
    />
  );
}
