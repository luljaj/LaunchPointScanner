# Launch Point Scanner

Little Tampermonkey script for the Launch Point Google Form. Scan student IDs and equipment into one box and it fills the form for you. Equipment picks its console station automatically. If no station is selected when you press S, it uses PC.

A to check in, D to check out, S to submit, Esc to clear the Scan box. Use the shortcuts with an empty Scan box, and keep the field highlighted.

You can drag the window by its title. Make corrections directly in the form. S checks the entries first; clicking the actual Submit button leaves it up to Google Forms.

After submitting, it clicks Submit another response and opens a fresh form. 

To use it, install Tampermonkey in Chrome or Edge, create a script, paste in [this file](launch-point-smart-scanner.user.js), save, and reload the form. No npm setup needed.

Only runs on the Launch Point Google Form.
