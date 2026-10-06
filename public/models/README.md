Place `face-api.js` model files in this folder for full facial detection.

Expected files include at least:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`

The scanner page gracefully falls back to manual-assisted mode when these files are missing.
