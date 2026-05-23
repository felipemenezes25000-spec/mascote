using UnityEngine;

namespace Mascote.Unity.Animation
{
    /// <summary>
    /// Piscar procedural em bones eye_L / eye_R quando não há clip blink.
    /// </summary>
    public class BlinkController : MonoBehaviour
    {
        [SerializeField] Transform eyeL;
        [SerializeField] Transform eyeR;
        [SerializeField] float intervalMin = 2f;
        [SerializeField] float intervalMax = 5f;
        [SerializeField] float blinkDuration = 0.12f;

        float _nextBlink;
        float _blinkT;
        bool _enabled = true;
        bool _blinking;

        void Update()
        {
            if (!_enabled) return;

            if (!_blinking && Time.time >= _nextBlink)
            {
                _blinking = true;
                _blinkT = 0f;
            }

            if (!_blinking) return;

            _blinkT += Time.deltaTime;
            var y = _blinkT < blinkDuration * 0.5f
                ? Mathf.Lerp(1f, 0.15f, _blinkT / (blinkDuration * 0.5f))
                : Mathf.Lerp(0.15f, 1f, (_blinkT - blinkDuration * 0.5f) / (blinkDuration * 0.5f));

            ApplyEyeScale(y);

            if (_blinkT >= blinkDuration)
            {
                _blinking = false;
                ScheduleNext();
                ApplyEyeScale(1f);
            }
        }

        public void TriggerBlink()
        {
            _blinking = true;
            _blinkT = 0f;
        }

        public void SetEnabled(bool enabled) => _enabled = enabled;

        void ScheduleNext() => _nextBlink = Time.time + Random.Range(intervalMin, intervalMax);

        void ApplyEyeScale(float y)
        {
            if (eyeL != null) eyeL.localScale = new Vector3(eyeL.localScale.x, y, eyeL.localScale.z);
            if (eyeR != null) eyeR.localScale = new Vector3(eyeR.localScale.x, y, eyeR.localScale.z);
        }

        void OnEnable() => ScheduleNext();
    }
}
