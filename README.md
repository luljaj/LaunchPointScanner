# Launch Point Scanner

Little Tampermonkey script for the Launch Point Google Form. Scan student IDs and equipment into one box and it fills the form for you. Equipment picks its console station automatically. If no station is selected when you press S, it uses PC.

A to check in, D to check out, S to submit, Esc to clear the Scan box. Use the shortcuts with an empty Scan box, and keep the field highlighted.

You can drag the window by its title. Make corrections directly in the form. S checks the entries first; clicking the actual Submit button leaves it up to Google Forms.

After submitting, it clicks Submit another response and opens a fresh form.

To use it, install Tampermonkey in Chrome or Edge and paste [this file](launch-point-smart-scanner.user.js) into a new script. Before saving:

1. Get each form's ID from its normal link. It is the part between `/d/e/` and `/viewform`, not the whole URL.
2. Replace **every** `TEST_FORM_ID` with your test form's ID and **every** `ACTUAL_FORM_ID` with your actual form's ID. There are six of each, including the `@match` lines and the `ids` list. Use Replace All in the editor.
3. Save and reload the form. No npm setup needed.

Put the real IDs only in your local Tampermonkey copy. Keep the placeholders in GitHub. Only runs on the Launch Point Google Forms you fill in.
