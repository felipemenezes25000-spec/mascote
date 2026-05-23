using System;
using Mascote.Unity.State;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Mascote.Unity.Bridge
{
    /// <summary>
    /// Parse de mensagens JSON do RN. Usa Newtonsoft para tipos polimórficos e nested state.
    /// </summary>
    public static class JsonMessageParser
    {
        static readonly JsonSerializerSettings Settings = new()
        {
            MissingMemberHandling = MissingMemberHandling.Ignore,
            NullValueHandling = NullValueHandling.Ignore,
        };

        public static bool TryParseInbound(string json, out string messageType, out object payload)
        {
            messageType = null;
            payload = null;
            if (string.IsNullOrWhiteSpace(json)) return false;

            try
            {
                var root = JObject.Parse(json);
                messageType = root.Value<string>("type");
                if (string.IsNullOrEmpty(messageType)) return false;

                payload = messageType switch
                {
                    BridgeMessageTypes.StateUpdate => root.ToObject<RNStateUpdateMessage>(JsonSerializer.Create(Settings)),
                    BridgeMessageTypes.EventPlay => root.ToObject<RNEventPlayMessage>(JsonSerializer.Create(Settings)),
                    BridgeMessageTypes.Gesture => root.ToObject<RNGestureMessage>(JsonSerializer.Create(Settings)),
                    BridgeMessageTypes.QualitySet => root.ToObject<RNQualityMessage>(JsonSerializer.Create(Settings)),
                    BridgeMessageTypes.DebugSimulateFailure => root.ToObject<RNDebugMessage>(JsonSerializer.Create(Settings)),
                    _ => null,
                };
                return payload != null;
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogWarning($"[JsonMessageParser] Parse failed: {ex.Message}");
                return false;
            }
        }

        public static UnityMascotState ParseState(string json)
        {
            return JsonConvert.DeserializeObject<UnityMascotState>(json, Settings);
        }

        public static string SerializeOutbound(object message)
        {
            return JsonConvert.SerializeObject(message, Settings);
        }
    }
}
