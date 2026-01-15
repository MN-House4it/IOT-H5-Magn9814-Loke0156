import bodyParser from 'body-parser';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import mqtt, { MqttClient } from 'mqtt';
import passport from 'passport';

import app from '@app';
import config from '@config';
import { DeviceStatus, DeviceStatusMessage, RfidKeyMessage, PasswordMessage } from '@api-types/mqtt.types';
// import alertRoutes from '@routes/alert.routes';
// import authRoutes from '@routes/auth.routes';
// import deviceRoutes from '@routes/device.routes';
// import locationRoutes from '@routes/location.routes';
// import manageRoutes from '@routes/manage.routes';
// import profileRoutes from '@routes/profile.routes';
// import timeSeriesRoutes from '@routes/timeSeries.routes';
// import tsAlertsRoutes from '@routes/tsAlerts.routes';
import { processRfidScan, processPasswordInput, cleanupAllSessions } from '@services/access.service';

import './passport';

const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_RESET_SEC * 1000, // 60 minutes
  limit: config.RATE_LIMIT_COUNT, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

app.set('trust proxy', 1);
app.set('json spaces', 4);

app.use(cors());

app.use(helmet());
app.use(bodyParser.json({}));
app.use(passport.initialize());
app.use(limiter);

// app.use('/', authRoutes);
// app.use('/manage', manageRoutes);
// app.use('/profile', profileRoutes);
// app.use('/device', deviceRoutes);
// app.use('/location', locationRoutes);
// app.use('/alert', alertRoutes);
// app.use('/data', timeSeriesRoutes);
// app.use('/tsalert', tsAlertsRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(config.PORT, () => {
  console.info(`Server is running on ${config.PORT}`);

    console.info('MQTT Broker: ', config.MQTT_BROKER);

  // MQTT Connection
  const client: MqttClient = mqtt.connect(config.MQTT_BROKER, {
    username: config.MQTT_USERNAME,
    password: config.MQTT_PASSWORD,
  });

  client.on('connect', () => {
  console.info('Connected to MQTT Broker');

  // Build status message using model
  const statusMessage: DeviceStatusMessage = {
    deviceId: 'Backend',
    status: DeviceStatus.ONLINE,
  };

  // Publish online status
  client.publish(
      config.MQTT_STATUS_TOPIC,
      JSON.stringify(statusMessage, null, 2),
      { qos: 1, retain: true },
      (err) => {
        if (err) {
          console.error('Failed to publish status:', err);
        } else {
          console.info('📡 Server status published: ONLINE');
        }
      }
    );
    
    // Subscribe to RFID key topic
    client.subscribe(config.MQTT_RFID_KEY_TOPIC, (err) => {
      if (err) {
        console.error('MQTT RFID Key Subscription Error:', err);
      } else {
        console.info('Subscribed to RFID key topic:', config.MQTT_RFID_KEY_TOPIC);
      }
    });

    // Subscribe to keypad password topic
    client.subscribe(config.MQTT_KEYPAD_PASSWORD_TOPIC, (err) => {
      if (err) {
        console.error('MQTT Keypad Password Subscription Error:', err);
      } else {
        console.info('Subscribed to keypad password topic:', config.MQTT_KEYPAD_PASSWORD_TOPIC);
      }
    });
  });

  /**
   * 🔔 Listen for incoming MQTT messages
   */
  client.on('message', (topic, message) => {
    if (topic === config.MQTT_RFID_KEY_TOPIC) {
      const payload = message.toString();

      try {
        const rfidMessage: RfidKeyMessage = JSON.parse(payload);
        console.info('Parsed RFID payload:', rfidMessage);
        
        // Process the RFID scan through the access control flow
        processRfidScan(rfidMessage.rfidUid, rfidMessage.deviceId, client).catch((err) => {
          console.error('Error in processRfidScan:', err);
        });
      } catch (err) {
        console.warn('Failed to parse RFID payload as JSON:', err);
      }
    } else if (topic === config.MQTT_KEYPAD_PASSWORD_TOPIC) {
      const payload = message.toString();

      console.info('Keypad password message received');

      try {
        const passwordMessage: PasswordMessage = JSON.parse(payload);
        
        // Process the password input through the access control flow
        processPasswordInput(passwordMessage.input, passwordMessage.deviceId, client).catch((err) => {
          console.error('Error in processPasswordInput:', err);
        });
      } catch (err) {
        console.warn('Failed to parse password payload as JSON:', err);
      }
    }
  });

  client.on('error', (err) => {
    console.error('MQTT Client Error:', err);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.info('Shutting down gracefully...');
    cleanupAllSessions();
    client.end();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.info('Shutting down gracefully...');
    cleanupAllSessions();
    client.end();
    process.exit(0);
  });
});
