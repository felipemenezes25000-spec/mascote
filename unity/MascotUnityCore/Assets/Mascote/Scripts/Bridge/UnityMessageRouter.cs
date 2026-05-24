using Mascote.Unity.Core;
using Mascote.Unity.State;
using UnityEngine;

namespace Mascote.Unity.Bridge
{
    /// <summary>
    /// Roteia mensagens inbound para MascotDirector / handlers.
    /// </summary>
    public class UnityMessageRouter : MonoBehaviour
    {
        [SerializeField] MascotDirector director;
        [SerializeField] OutboundEventDispatcher outbound;
        [SerializeField] bool simulateFailureOnDebug;

        public void Configure(MascotDirector d, OutboundEventDispatcher o)
        {
            director = d;
            outbound = o;
        }

        void Awake()
        {
            if (director == null) director = FindFirstObjectByType<MascotDirector>();
            if (outbound == null) outbound = new OutboundEventDispatcher();
        }

        public void RouteJson(string json)
        {
            if (!JsonMessageParser.TryParseInbound(json, out var type, out var payload))
            {
                outbound?.SendError("PARSE_ERROR", "Invalid bridge JSON", true);
                return;
            }

            switch (type)
            {
                case BridgeMessageTypes.StateUpdate:
                    var stateMsg = (RNStateUpdateMessage)payload;
                    director?.ApplyState(stateMsg.state, stateMsg.seq);
                    break;

                case BridgeMessageTypes.EventPlay:
                    var eventMsg = (RNEventPlayMessage)payload;
                    director?.PlayEvent(eventMsg.@event, eventMsg.seq);
                    break;

                case BridgeMessageTypes.Gesture:
                    var gestureMsg = (RNGestureMessage)payload;
                    director?.HandleGesture(gestureMsg.gesture);
                    outbound?.SendGestureReceived(gestureMsg.gesture);
                    break;

                case BridgeMessageTypes.QualitySet:
                    var qualityMsg = (RNQualityMessage)payload;
                    director?.SetQuality(qualityMsg.quality);
                    break;

                case BridgeMessageTypes.DebugSimulateFailure:
                    var debugMsg = (RNDebugMessage)payload;
                    if (simulateFailureOnDebug && debugMsg.enabled)
                        outbound?.SendError("DEBUG_FAILURE", "Simulated failure", true);
                    break;

                default:
                    outbound?.SendError("UNKNOWN_TYPE", $"Unknown type: {type}", true);
                    break;
            }
        }

        /// <summary>PING legado para testes — responde ready.</summary>
        public void Ping() => outbound?.SendReady();
    }
}
