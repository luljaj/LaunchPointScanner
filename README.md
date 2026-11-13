# Launch Point Scanner

Little Tampermonkey script for the Launch Point Google Form. Scan student IDs and equipment into one box and it fills the form for you. Equipment picks its console station automatically. If no station is selected when you press S, it uses PC.

**A** to check in, **D** to check out, **S** to submit, **P** for PC, **Esc** to clear the Scan box. Enter or Tab adds a scan. Use the shortcuts with an empty Scan box.

You can drag the window by its title. Make corrections directly in the form. S checks the entries first; clicking the actual Submit button leaves it up to Google Forms.

After submitting, it clicks Submit another response and opens a fresh form. It skips Edit your response.

To use it, install Tampermonkey in Chrome or Edge, create a script, paste in [this file](launch-point-smart-scanner.user.js), save, and reload the form. No npm setup needed.

Only runs on the Launch Point [test form](https://docs.google.com/forms/d/e/1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q/viewform) and [actual form](https://docs.google.com/forms/d/e/1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ/viewform).
