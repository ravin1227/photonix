import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import {useCameraPermission} from 'react-native-vision-camera';
import {useAuth} from '../../contexts/AuthContext';
import {AuthStackParamList} from '../../navigation/AuthNavigator';

type QRScannerScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'QRScanner'
>;

interface QRCodeData {
  server_url: string;
  token: string;
  user_email?: string;
  expires_at?: string;
}

export default function QRScannerScreen() {
  const navigation = useNavigation<QRScannerScreenNavigationProp>();
  const {qrLogin} = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');

  const handleQRCodeRead = async (data: string) => {
    // Prevent processing if already processing or if this is the same code
    if (isProcessing || scannedData === data) return;

    setIsProcessing(true);
    setScannedData(data);

    try {
      // Parse QR code data
      let qrData: QRCodeData;
      try {
        qrData = JSON.parse(data);
      } catch (parseError) {
        Alert.alert('Invalid QR Code', 'The QR code format is invalid', [
          {
            text: 'OK',
            onPress: () => {
              setIsProcessing(false);
              setScannedData(null); // Reset to allow re-scanning
            },
          },
        ]);
        return;
      }

      // Validate QR code structure
      if (!qrData.token || !qrData.server_url) {
        Alert.alert('Invalid QR Code', 'QR code is missing required information', [
          {
            text: 'OK',
            onPress: () => {
              setIsProcessing(false);
              setScannedData(null);
            },
          },
        ]);
        return;
      }

      // Check expiration if provided
      if (qrData.expires_at) {
        const expiresAt = new Date(qrData.expires_at);
        if (expiresAt < new Date()) {
          Alert.alert('Expired QR Code', 'This QR code has expired. Please generate a new one.', [
            {
              text: 'OK',
              onPress: () => {
                setIsProcessing(false);
                setScannedData(null);
              },
            },
          ]);
          return;
        }
      }

      // Update API base URL to the server from QR code
      const serverUrl = qrData.server_url.endsWith('/api/v1')
        ? qrData.server_url
        : `${qrData.server_url}/api/v1`;

      // Perform QR login via AuthContext (this will update auth state)
      const result = await qrLogin(qrData.token, serverUrl);

      if (!result.success) {
        Alert.alert(
          'Login Failed',
          result.error || 'Failed to authenticate with QR code',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsProcessing(false);
                setScannedData(null); // Reset to allow re-scanning
              },
            },
          ],
        );
        return;
      }

      // Success! Show success state
      setIsSuccess(true);
      // Navigation will happen automatically via RootNavigator when auth state changes
      // Keep success state visible briefly before navigation
      // The RootNavigator will detect isAuthenticated change and navigate automatically
    } catch (error: any) {
      console.error('QR Login Error:', error);
      Alert.alert(
        'Error',
        error.message || 'An error occurred while processing the QR code',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsProcessing(false);
              setScannedData(null); // Reset to allow re-scanning
            },
          },
        ],
      );
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      // Keep scanning even if processing (for multiple QR codes)
      // But only process if not already processing and not showing success
      if (codes.length > 0 && !isProcessing && !isSuccess) {
        const code = codes[0];
        if (code.value) {
          handleQRCodeRead(code.value);
        }
      }
    },
  });

  useEffect(() => {
    // Request permission on mount
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Checking camera permission...</Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera Permission Required</Text>
          <Text style={styles.errorSubtext}>
            Please enable camera access in your device settings to scan QR codes.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={requestPermission}>
            <Text style={styles.retryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Camera Not Available</Text>
          <Text style={styles.errorSubtext}>
            No camera device found on this device.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!isSuccess} // Keep camera active unless success
          codeScanner={codeScanner}
        />
        
        {/* Scanning Frame Overlay - Show when not processing or success */}
        {!isProcessing && !isSuccess && (
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <View style={styles.topContent}>
              <Text style={styles.topContentText}>
                Point your camera at the QR code
              </Text>
            </View>
            <View style={styles.bottomContent}>
              <Text style={styles.bottomContentText}>
                Make sure the QR code is clearly visible
              </Text>
            </View>
          </View>
        )}

        {/* Processing Overlay */}
        {isProcessing && !isSuccess && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.processingText}>Processing QR code...</Text>
            <Text style={styles.processingSubtext}>Please wait</Text>
          </View>
        )}

        {/* Success Overlay */}
        {isSuccess && (
          <View style={styles.successOverlay}>
            <View style={styles.successIcon}>
              <Text style={styles.successCheckmark}>✓</Text>
            </View>
            <Text style={styles.successText}>Login Successful!</Text>
            <Text style={styles.successSubtext}>Redirecting to app...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  topContent: {
    position: 'absolute',
    top: 100,
    alignItems: 'center',
  },
  topContentText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  bottomContentText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  processingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCheckmark: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  successText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000000',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
