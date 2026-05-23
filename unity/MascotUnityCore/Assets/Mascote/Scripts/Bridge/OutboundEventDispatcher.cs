using System;
using Mascote.Unity.State;

namespace Mascote.Unity.Bridge
{
    /// <summary>
    /// Envia mensagens Unity → RN via callback registrado (postMessage nativo no embed).
    /// </summary>
    public class OutboundEventDispatcher
    {
        public const string CoreVersion = "unity-core-0.2.0";

        Action<string> _sendJson;

        public void SetSender(Action<string> sendJson) => _sendJson = sendJson;

        public void SendReady(string[] capabilities = null)
        {
            Send(new UnityReadyMessage
            {
                version = CoreVersion,
                capabilities = capabilities != null
                    ? new System.Collections.Generic.List<string>(capabilities)
                    : new System.Collections.Generic.List<string> { "state.update", "event.play", "gesture" },
            });
        }

        public void SendError(string code, string message, bool recoverable)
        {
            Send(new UnityErrorMessage { code = code, message = message, recoverable = recoverable });
        }

        public void SendAnimationComplete(string animationName)
        {
            Send(new UnityAnimationCompleteMessage { name = animationName });
        }

        public void SendGestureReceived(string gesture)
        {
            Send(new UnityGestureReceivedMessage { gesture = gesture });
        }

        void Send(object message)
        {
            if (_sendJson == null)
            {
                UnityEngine.Debug.Log($"[Outbound] (no sender) {JsonMessageParser.SerializeOutbound(message)}");
                return;
            }

            _sendJson(JsonMessageParser.SerializeOutbound(message));
        }
    }
}
