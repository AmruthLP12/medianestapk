import { Linking, Text, TouchableOpacity, View } from "react-native";

export default function ContactDeveloperScreen() {
  const handleEmailPress = () => {
    Linking.openURL(
      'mailto:amruthlp12+medianest@gmail.com?subject=Request for Delete PIN&body=Hi Amruth,%0D%0A%0D%0AI need assistance with deleting an image on Media Nest.%0D%0A%0D%0AThanks!'
    );
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-4">
      <Text className="text-xl font-bold text-blue-500 text-center mb-4">
        Need to delete an image? Contact the developer
      </Text>
      <TouchableOpacity
        onPress={handleEmailPress}
        className="px-5 py-3 bg-blue-500 rounded-lg"
      >
        <Text className="text-white font-medium text-center">
          📩 Email Support
        </Text>
      </TouchableOpacity>
    </View>
  );
}
