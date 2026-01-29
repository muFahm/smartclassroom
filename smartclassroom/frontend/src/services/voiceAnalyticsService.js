import ROSLIB from "roslib";

const ROS_BRIDGE_URL = process.env.REACT_APP_ROS_BRIDGE_URL || "ws://192.168.88.144:9090";
const ROS_VOICE_TOPIC = process.env.REACT_APP_VOICE_ANALYTICS_TOPIC || "/agent/context/nlp";
const ROS_VOICE_MSG_TYPE = process.env.REACT_APP_VOICE_ANALYTICS_MSG_TYPE || "std_msgs/msg/String";

let rosListener = null;
let transcriptCallbacks = [];
let emotionCallbacks = [];
let statusCallbacks = [];
const emotionWindow = [];
const EMOTION_WINDOW_SIZE = 50;

function normalizeTranscript(item) {
  if (!item) return null;
  return {
    nim: item.nim ? String(item.nim) : null,
    speaker: item.speaker || item.name || item.speaker_id || null,
    text: item.text || item.transcript || "",
    confidence: typeof item.confidence === "number" ? item.confidence : null,
    timestamp: item.timestamp || Date.now(),
  };
}

function normalizeEmotion(payload) {
  if (!payload) return null;
  if (typeof payload === "string") {
    return { label: payload };
  }
  if (payload.label) {
    return { label: payload.label };
  }
  return {
    fokus: typeof payload.fokus === "number" ? payload.fokus : 0,
    bahagia: typeof payload.bahagia === "number" ? payload.bahagia : 0,
    sedih: typeof payload.sedih === "number" ? payload.sedih : 0,
    bosan: typeof payload.bosan === "number" ? payload.bosan : 0,
  };
}

function mapEmotionLabel(label) {
  if (!label) return label;
  const lowered = String(label).toLowerCase();
  const map = {
    sad: "sedih",
    sadness: "sedih",
    happy: "bahagia",
    happiness: "bahagia",
    bored: "bosan",
    boredom: "bosan",
    focus: "fokus",
    focused: "fokus",
    neutral: "fokus",
  };
  return map[lowered] || lowered;
}

function updateEmotionSummary(labelOrSummary) {
  if (!labelOrSummary) return null;
  if (labelOrSummary.label) {
    emotionWindow.push(labelOrSummary.label);
    while (emotionWindow.length > EMOTION_WINDOW_SIZE) emotionWindow.shift();

    const counts = emotionWindow.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      { fokus: 0, bahagia: 0, sedih: 0, bosan: 0 },
    );

    const total = emotionWindow.length || 1;
    return {
      fokus: Math.round((counts.fokus / total) * 100),
      bahagia: Math.round((counts.bahagia / total) * 100),
      sedih: Math.round((counts.sedih / total) * 100),
      bosan: Math.round((counts.bosan / total) * 100),
    };
  }

  return labelOrSummary;
}

export function initVoiceAnalytics(onTranscript, onEmotion) {
  if (onTranscript) transcriptCallbacks.push(onTranscript);
  if (onEmotion) emotionCallbacks.push(onEmotion);
  const onStatus = arguments.length > 2 ? arguments[2] : null;
  if (onStatus) statusCallbacks.push(onStatus);

  if (!rosListener) {
    const ros = new ROSLIB.Ros({ url: ROS_BRIDGE_URL });

    ros.on("connection", () => {
      console.log(`✅ Connected to ROS2 bridge at ${ROS_BRIDGE_URL}`);
      statusCallbacks.forEach((cb) => cb({ connected: true, url: ROS_BRIDGE_URL }));
    });

    ros.on("error", (error) => {
      console.error("❌ ROS2 connection error:", error);
      statusCallbacks.forEach((cb) => cb({ connected: false, url: ROS_BRIDGE_URL, error }));
    });

    ros.on("close", () => {
      console.warn("🔌 Disconnected from ROS2 bridge");
      statusCallbacks.forEach((cb) => cb({ connected: false, url: ROS_BRIDGE_URL }));
    });

    const topic = new ROSLIB.Topic({
      ros,
      name: ROS_VOICE_TOPIC,
      messageType: ROS_VOICE_MSG_TYPE,
    });

    topic.subscribe((message) => {
      let payload = null;
      try {
        if (message?.data && typeof message.data === "string") {
          payload = JSON.parse(message.data);
        } else {
          payload = message;
        }
      } catch (error) {
        console.error("❌ Error parsing voice analytics payload:", error);
        return;
      }

      if (payload?.nlp) {
        payload = {
          ...payload.nlp,
          timestamp: payload.timestamp || payload.nlp.timestamp,
        };
      }

      const isSingleFormat =
        payload &&
        (payload.speaker || payload.text || payload.emotion || payload.confidence || payload.timestamp);

      const transcripts = isSingleFormat
        ? [payload]
        : payload?.transcripts || payload?.transcript || [];
      const transcriptList = Array.isArray(transcripts) ? transcripts : [transcripts];
      transcriptList
        .map((entry) => {
          const normalized = normalizeTranscript(entry);
          if (!normalized) return null;
          const ts = normalized.timestamp;
          if (typeof ts === "number" && ts < 1e12) {
            normalized.timestamp = ts * 1000;
          }
          return normalized;
        })
        .filter(Boolean)
        .forEach((entry) => transcriptCallbacks.forEach((cb) => cb(entry)));

      const emotionPayload = isSingleFormat
        ? payload?.emotion || payload?.speech_emotion
        : payload?.emotions || payload?.emotion || payload?.speech_emotion || null;
      const normalizedEmotion = normalizeEmotion(
        typeof emotionPayload === "string" ? mapEmotionLabel(emotionPayload) : emotionPayload,
      );
      const summary = updateEmotionSummary(normalizedEmotion);
      if (summary) {
        emotionCallbacks.forEach((cb) => cb(summary));
      }
    });

    rosListener = { ros, topic };
  }

  return {
    disconnect: () => {
      if (onTranscript) {
        transcriptCallbacks = transcriptCallbacks.filter((cb) => cb !== onTranscript);
      }
      if (onEmotion) {
        emotionCallbacks = emotionCallbacks.filter((cb) => cb !== onEmotion);
      }
      if (onStatus) {
        statusCallbacks = statusCallbacks.filter((cb) => cb !== onStatus);
      }

      if (transcriptCallbacks.length === 0 && emotionCallbacks.length === 0 && rosListener) {
        try {
          rosListener.topic.unsubscribe();
        } catch (error) {
          console.warn("⚠️ Error unsubscribing ROS topic:", error);
        }

        try {
          rosListener.ros.close();
        } catch (error) {
          console.warn("⚠️ Error closing ROS connection:", error);
        }

        rosListener = null;
      }
    },
  };
}
