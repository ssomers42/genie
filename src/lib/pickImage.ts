import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

async function uriToJpegDataUrl(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
  );
  const outUri = manipulated.uri;
  if (outUri.startsWith("data:")) {
    return outUri;
  }
  const response = await fetch(outUri);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function pickImageAsJpegDataUrl(): Promise<string> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Photo library permission denied");
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
  });
  if (res.canceled || !res.assets[0]?.uri) {
    throw new Error("Canceled");
  }
  return uriToJpegDataUrl(res.assets[0].uri);
}
