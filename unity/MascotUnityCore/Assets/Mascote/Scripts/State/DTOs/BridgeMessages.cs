using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Mascote.Unity.State
{
    /// <summary>
    /// Mensagens RN → Unity (UNITY_BRIDGE_CONTRACT.md).
    /// </summary>
    public static class BridgeMessageTypes
    {
        public const string StateUpdate = "state.update";
        public const string EventPlay = "event.play";
        public const string Gesture = "gesture";
        public const string QualitySet = "quality.set";
        public const string DebugSimulateFailure = "debug.simulateFailure";
    }

    public static class OutboundMessageTypes
    {
        public const string Ready = "ready";
        public const string Error = "error";
        public const string AnimationComplete = "animation.complete";
        public const string GestureReceived = "gesture.received";
        public const string Ack = "ack";
    }

    [Serializable]
    public class RNStateUpdateMessage
    {
        public string type = BridgeMessageTypes.StateUpdate;
        public UnityMascotState state;
        public int seq;
    }

    [Serializable]
    public class RNEventPlayMessage
    {
        public string type = BridgeMessageTypes.EventPlay;

        [JsonProperty("event")]
        public UnityMascotEvent @event;

        public int seq;
    }

    [Serializable]
    public class RNGestureMessage
    {
        public string type = BridgeMessageTypes.Gesture;
        public string gesture;
    }

    [Serializable]
    public class RNQualityMessage
    {
        public string type = BridgeMessageTypes.QualitySet;
        public string quality;
    }

    [Serializable]
    public class RNDebugMessage
    {
        public string type = BridgeMessageTypes.DebugSimulateFailure;
        public bool enabled;
    }

    [Serializable]
    public class UnityReadyMessage
    {
        public string type = OutboundMessageTypes.Ready;
        public string version;
        public List<string> capabilities;
    }

    [Serializable]
    public class UnityErrorMessage
    {
        public string type = OutboundMessageTypes.Error;
        public string code;
        public string message;
        public bool recoverable;
    }

    [Serializable]
    public class UnityAnimationCompleteMessage
    {
        public string type = OutboundMessageTypes.AnimationComplete;
        public string name;
    }

    [Serializable]
    public class UnityGestureReceivedMessage
    {
        public string type = OutboundMessageTypes.GestureReceived;
        public string gesture;
    }

    [Serializable]
    public class UnityAckMessage
    {
        public string type = OutboundMessageTypes.Ack;
        public int seq;
        public string originalType;
    }
}
