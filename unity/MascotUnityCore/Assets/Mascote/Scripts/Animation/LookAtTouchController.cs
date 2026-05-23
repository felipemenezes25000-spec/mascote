using UnityEngine;

namespace Mascote.Unity.Animation
{
    /// <summary>
    /// Olhar suave em direção ao toque / centro da tela. Envia gesture.received via callback.
    /// </summary>
    public class LookAtTouchController : MonoBehaviour
    {
        [SerializeField] Transform headBone;
        [SerializeField] Transform eyeTarget;
        [SerializeField] float lookSpeed = 6f;
        [SerializeField] float maxYaw = 25f;
        [SerializeField] float maxPitch = 12f;

        Vector3 _targetLocal;
        bool _hasTarget;
        bool _enabled = true;
        Quaternion _headBase;

        public System.Action<string> OnGesture;

        void Awake()
        {
            if (headBone != null) _headBase = headBone.localRotation;
            _targetLocal = Vector3.forward;
        }

        void Update()
        {
            if (!_enabled || headBone == null) return;

            if (!_hasTarget)
            {
                headBone.localRotation = Quaternion.Slerp(
                    headBone.localRotation,
                    _headBase,
                    Time.deltaTime * lookSpeed);
                return;
            }

            var desired = Quaternion.LookRotation(_targetLocal, Vector3.up);
            var euler = desired.eulerAngles;
            euler.x = NormalizeAngle(euler.x);
            euler.y = NormalizeAngle(euler.y);
            euler.x = Mathf.Clamp(euler.x, -maxPitch, maxPitch);
            euler.y = Mathf.Clamp(euler.y, -maxYaw, maxYaw);
            euler.z = 0f;

            headBone.localRotation = Quaternion.Slerp(
                headBone.localRotation,
                _headBase * Quaternion.Euler(euler),
                Time.deltaTime * lookSpeed);
        }

        public void LookAtScreenPoint(Vector2 normalized)
        {
            _hasTarget = true;
            _targetLocal = new Vector3(
                (normalized.x - 0.5f) * 2f,
                (normalized.y - 0.5f) * 2f,
                1f).normalized;
        }

        public void ClearLookTarget() => _hasTarget = false;

        public void HandleTouch(string gesture, Vector2 normalized)
        {
            LookAtScreenPoint(normalized);
            OnGesture?.Invoke(gesture);
        }

        public void SetEnabled(bool enabled)
        {
            _enabled = enabled;
            if (!enabled && headBone != null)
                headBone.localRotation = _headBase;
        }

        static float NormalizeAngle(float angle)
        {
            if (angle > 180f) angle -= 360f;
            return angle;
        }
    }
}
