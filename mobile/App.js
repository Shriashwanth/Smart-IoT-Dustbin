import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Set this to your local server IP (e.g. 'http://192.168.1.100:3000')
const SERVER_IP = 'http://localhost:3000'; 
const BIN_ID = 'bin_001';

export default function App() {
  const [binData, setBinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch telemetry from server
  const fetchBinStatus = async () => {
    try {
      const response = await fetch(`${SERVER_IP}/api/bins`);
      const bins = await response.json();
      const targetBin = bins.find(b => b.id === BIN_ID);
      if (targetBin) {
        setBinData(targetBin);
      }
    } catch (error) {
      console.warn("Failed to reach waste backend API:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBinStatus();
    // Poll telemetry every 3 seconds for real-time responsiveness
    const interval = setInterval(fetchBinStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualEmpty = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${SERVER_IP}/api/bins/${BIN_ID}/empty`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        fetchBinStatus();
      }
    } catch (error) {
      console.warn("Error marking bin emptied:", error.message);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Connecting to Waste Sync...</Text>
      </View>
    );
  }

  // Determine status color codes
  let statusColor = '#10b981'; // Green
  let statusText = 'Normal';
  
  if (binData) {
    if (binData.fillPercentage >= 95) {
      statusColor = '#ef4444'; // Red
      statusText = 'Critical';
    } else if (binData.fillPercentage >= 80) {
      statusColor = '#f59e0b'; // Amber
      statusText = 'Warning';
    }
  }

  const fillPercentage = binData ? Math.round(binData.fillPercentage) : 0;
  const batteryVoltage = binData ? binData.batteryVoltage : 0.0;
  const lidCount = binData ? binData.lidOpenCount : 0;
  const name = binData ? binData.name : 'Unknown Bin';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="trash-can" size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>Waste IoT Collector</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchBinStatus}>
          <MaterialCommunityIcons name="cached" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Main Bin Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.binName}>{name}</Text>
              <Text style={styles.binId}>ID: {BIN_ID}</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: statusColor + '15', borderColor: statusColor }]}>
              <Text style={[styles.statusTagText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>

          {/* Fill Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.circularGauge}>
              {/* Animated Inner Level Background */}
              <View style={[styles.gaugeFill, { height: `${fillPercentage}%`, backgroundColor: statusColor }]} />
              <Text style={styles.gaugeVal}>{fillPercentage}%</Text>
              <Text style={styles.gaugeSub}>FILLED</Text>
            </View>
          </View>

          {/* Detailed Metrics */}
          <View style={styles.metricsGrid}>
            
            <View style={styles.metricItem}>
              <View style={styles.metricHeader}>
                <MaterialCommunityIcons name="battery-charging" size={18} color="#facc15" />
                <Text style={styles.metricLabel}>Solar Battery</Text>
              </View>
              <Text style={styles.metricValue}>{batteryVoltage.toFixed(2)} V</Text>
              <Text style={styles.metricSub}>{batteryVoltage >= 3.6 ? 'Healthy' : 'Low Volt'}</Text>
            </View>

            <View style={styles.metricItem}>
              <View style={styles.metricHeader}>
                <MaterialCommunityIcons name="door-open" size={18} color="#3b82f6" />
                <Text style={styles.metricLabel}>Lid Openings</Text>
              </View>
              <Text style={styles.metricValue}>{lidCount}</Text>
              <Text style={styles.metricSub}>Usage cycles</Text>
            </View>

          </View>
        </View>

        {/* Collection Action Section */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionTitle}>Waste Collection Dispatch</Text>
          <Text style={styles.actionDesc}>
            Press the button below once the physical bin has been emptied to reset telemetry sensors.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton} 
            onPress={handleManualEmpty}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#0b0f19" />
            ) : (
              <>
                <MaterialCommunityIcons name="truck-delivery" size={20} color="#0b0f19" />
                <Text style={styles.emptyButtonText}>Mark Bin as Emptied</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: 'rgba(22, 32, 57, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  binName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
  binId: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginVertical: 25,
  },
  circularGauge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gaugeFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    opacity: 0.8,
  },
  gaugeVal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  gaugeSub: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  metricItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  metricSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  actionsCard: {
    backgroundColor: 'rgba(22, 32, 57, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    padding: 20,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 6,
  },
  actionDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  emptyButtonText: {
    color: '#0b0f19',
    fontSize: 14,
    fontWeight: '700',
  },
});
