import { Stack } from "expo-router";

export default function AddLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#ffffff" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="select" />
      <Stack.Screen name="group" />
      <Stack.Screen name="create-group" />
    </Stack>
  );
}
