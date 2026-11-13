# Launch Point Scanner

Little Tampermonkey script for the Launch Point Google Form. Scan student IDs and equipment into one box and it fills the form for you. Equipment picks its console station automatically. If no station is selected when you press S, it uses PC.

A to check in, D to check out, S to submit, Esc to clear the Scan box. Use the shortcuts with an empty Scan box, and keep the field highlighted.

You can drag the window by its title. Make corrections directly in the form. S checks the entries first; clicking the actual Submit button leaves it up to Google Forms.

After submitting, it clicks Submit another response and opens a fresh form.

To use it, install Tampermonkey in Chrome or Edge and paste [this file](launch-point-smart-scanner.user.js) into a new script. Before saving:

1. Get the actual form's ID from its normal link. It is the part between `/d/e/` and `/viewform`, not the whole URL.
2. Use Replace All to replace `ACTUAL_FORM_ID` with that ID. There are six places: five `@match` lines and the `formId` setting. Leave the rest of each URL as it is.
3. Save and reload the form. No npm setup needed.

Put the real ID only in your local Tampermonkey copy. Keep the placeholder in GitHub. The match rules only allow that form and its confirmation pages, including account-specific URLs. No test form or broad Google Forms match.
