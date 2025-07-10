import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "https://media-nests.vercel.app/api/upload";
const API_KEY = "my_super_secret_key";
const { width: screenWidth } = Dimensions.get("window");
const imageSize = (screenWidth - 48) / 2; // 2 columns with padding

type ImageKitFile = {
  fileId: string;
  url: string;
  name: string;
  thumbnailUrl?: string;
  height?: number;
  width?: number;
  createdAt?: string;
};

export default function App() {
  const [images, setImages] = useState<ImageKitFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageKitFile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePinModalVisible, setDeletePinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    console.log("useEffect called");
    requestPermissions();
    fetchImages();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Sorry, we need camera roll permissions to make this work!"
      );
    }
  };

  const fetchImages = async () => {
    console.log("📡 Starting fetchImages");

    try {
      setError(null);
      setLoading(true);

      const res = await fetch(API_URL, {
        headers: { "x-api-key": API_KEY },
      });

      console.log("📦 Fetch response received:", res.status);

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setImages(data.files || []);
    } catch (err: any) {
      console.error("❌ Fetch images error:", err);
      setError(err.message || "Server error. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchImages();
  };

  const pickImageAndUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        await uploadImage(asset);
      }
    } catch (error) {
      console.error("Pick image error:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        await uploadImage(asset);
      }
    } catch (error) {
      console.error("Take photo error:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const localUri = asset.uri;
    const filename = localUri.split("/").pop()!;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    const formData = new FormData();
    formData.append("file", {
      uri: localUri,
      name: filename,
      type,
    } as any);

    try {
      setUploading(true);
      setError(null);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
          "x-api-key": "my_super_secret_key",
        },
        body: formData,
      });

      if (response.ok) {
        await fetchImages(); // Refresh gallery
        Alert.alert("Success", "Image uploaded successfully!");
      } else {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Error", "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Add Image",
      "Choose an option",
      [
        { text: "Camera", onPress: takePhoto },
        { text: "Gallery", onPress: pickImageAndUpload },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const openImageModal = (image: ImageKitFile) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const deleteImage = async (fieldId: string, refreshImages: () => void) => {
    Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(
              "https://media-nests.vercel.app/api/upload",
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": "my_super_secret_key",
                },
                body: JSON.stringify({ fileId: fieldId }), // ✅ fixed here
              }
            );

            if (res.ok) {
              Alert.alert("Success", "Image deleted successfully");
              refreshImages();
            } else {
              const errText = await res.text();
              console.error("Delete failed:", errText);
              Alert.alert("Error", "Failed to delete image");
            }
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "An error occurred while deleting image");
          }
        },
      },
    ]);
  };

  const confirmAndDelete = () => {
    const SECRET_PIN = "1234"; // You can load this from env for better security

    if (pinInput.trim() === SECRET_PIN) {
      if (deleteTarget) {
        deleteImage(deleteTarget, fetchImages);
      }
      setDeletePinModalVisible(false);
      setPinInput("");
      setDeleteTarget(null);
    } else {
      Alert.alert("Incorrect PIN", "The PIN you entered is incorrect.");
    }
  };

  const renderImageItem = ({ item }: { item: ImageKitFile }) => (
    <TouchableOpacity
      className="rounded-xl overflow-hidden bg-gray-800 mb-4"
      style={{ width: imageSize, height: imageSize }}
      onPress={() => openImageModal(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.url }}
        className="w-full h-full"
        resizeMode="cover"
      />
      <View className="absolute bottom-0 left-0 right-0 bg-black/70 p-2">
        <Text className="text-white text-xs font-medium" numberOfLines={1}>
          {item.fileId}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-10">
      <Text className="text-6xl mb-4">📸</Text>
      <Text className="text-white text-2xl font-bold mb-2">No Images Yet</Text>
      <Text className="text-gray-400 text-base text-center mb-8">
        Upload your first image to get started
      </Text>
      <TouchableOpacity
        className="bg-blue-500 py-3 px-6 rounded-lg"
        onPress={showImageOptions}
        disabled={uploading}
      >
        <Text className="text-white text-base font-semibold">Add Image</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 justify-center items-center px-10">
      <Text className="text-6xl mb-4">⚠️</Text>
      <Text className="text-red-400 text-2xl font-bold mb-2">
        Something went wrong
      </Text>
      <Text className="text-gray-400 text-base text-center mb-8">{error}</Text>
      <TouchableOpacity
        className="bg-blue-500 py-3 px-6 rounded-lg"
        onPress={() => {
          setLoading(true);
          fetchImages();
        }}
      >
        <Text className="text-white text-base font-semibold">Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Header */}
      <View className="px-5 py-5 pb-2 border-b border-gray-700">
        <Text className="text-white text-2xl font-bold text-center mb-2">
          📸 Media Nest Gallery
        </Text>
        <View className="items-center">
          <Text className="text-gray-400 text-sm">
            {images.length} {images.length === 1 ? "image" : "images"}
          </Text>
        </View>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        className={`mx-4 my-4 py-4 px-6 rounded-xl flex-row justify-center items-center shadow-lg ${
          uploading ? "bg-gray-600" : "bg-blue-500"
        }`}
        onPress={showImageOptions}
        disabled={uploading}
      >
        <Text className="text-white text-base font-semibold">
          {uploading ? "Uploading..." : "➕ Add Image"}
        </Text>
        {uploading && (
          <ActivityIndicator size="small" color="#ffffff" className="ml-2" />
        )}
      </TouchableOpacity>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-400 text-base mt-4">
            Loading images...
          </Text>
        </View>
      ) : error ? (
        renderError()
      ) : images.length > 0 ? (
        <FlatList
          data={images}
          keyExtractor={(item, index) => item.fileId || index.toString()}
          numColumns={2}
          className="px-4"
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={renderImageItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Image Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeImageModal}
      >
        <View className="flex-1 justify-center items-center">
          <TouchableOpacity
            className="absolute top-0 left-0 right-0 bottom-0 bg-black/90"
            onPress={closeImageModal}
          />
          {selectedImage && (
            <View className="w-[90%] max-h-[80%] bg-gray-800 rounded-xl overflow-hidden">
              <Image
                source={{ uri: selectedImage.url }}
                className="w-full h-80"
                resizeMode="contain"
              />
              <View className="flex-row p-4">
                <TouchableOpacity
                  className="flex-1 bg-blue-500 py-3 mx-2 rounded-lg items-center"
                  onPress={closeImageModal}
                >
                  <Text className="text-white text-base font-semibold">
                    Close
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-red-500 py-3 mx-2 rounded-lg items-center"
                  onPress={() => {
                    closeImageModal();
                    setDeleteTarget(selectedImage.fileId);
                    setDeletePinModalVisible(true); // Show PIN modal
                  }}
                >
                  <Text className="text-white text-base font-semibold">
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={deletePinModalVisible}
        onRequestClose={() => setDeletePinModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/80">
          <View className="w-[85%] bg-gray-800 p-6 rounded-xl">
            <Text className="text-white text-lg font-semibold mb-4 text-center">
              Enter Secret PIN to Delete
            </Text>

            <View className="bg-white rounded-md px-3 py-2 mb-4">
              <TextInput
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Enter PIN"
                placeholderTextColor="#888"
                secureTextEntry
                keyboardType="number-pad"
                className="text-black text-base"
              />
            </View>

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="bg-gray-600 px-4 py-3 rounded-lg flex-1 mr-2 items-center"
                onPress={() => {
                  setDeletePinModalVisible(false);
                  setPinInput("");
                  setDeleteTarget(null);
                }}
              >
                <Text className="text-white font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-red-600 px-4 py-3 rounded-lg flex-1 ml-2 items-center"
                onPress={confirmAndDelete}
              >
                <Text className="text-white font-medium">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
