# Launch Point Scanner

Install [launch-point-smart-scanner.user.js](launch-point-smart-scanner.user.js) in Tampermonkey on Chrome or Edge. Create a new script, replace the starter code with the entire file, and save. When updating, replace the existing script. Enable userscripts if the browser requests it, then reload the form.

The small corner interface contains **Launch Point Scanner**, a **Scan** textbox, and expandable **Help**. Drag the title to move the window. Scanned values appear in the original Google Form, and the page scrolls to each filled field while keyboard focus stays in Scan. Make corrections and select other actions or stations directly there. Errors appear below Scan only when needed.

| Input | Result |
| --- | --- |
| 15 digits + Enter | Next student ID, maximum four |
| 4 digits + Enter | Next equipment barcode, maximum four |
| A | Check in and borrow equipment |
| W | Check out and return equipment |
| D | Validate and submit the Google Form |
| P | Select PC Station |
| Esc | Clear unfinished scan |

Your scanner should send Enter after each barcode. When typing instead, press Enter to add the barcode. Use shortcuts with an empty Scan box; shortcuts do not interrupt editing other text fields.

Known equipment selects its station: 1088–1090 → Console 1, 1082–1084 → Console 2, 1085–1087 → Console 3. Other four-digit equipment barcodes are accepted. **If no station is selected at submission, PC Station is selected automatically**, including when unknown equipment is present. An existing station selection is kept. Conflicting mapped equipment, duplicate codes, and invalid lengths still block submission.

After Google confirms the response, the script automatically clicks **Submit another response**. The next blank form shows the scanner again and focuses Scan. Account-specific paths such as `/forms/u/0/d/e/.../viewform?usp=form_confirm` are supported. If the confirmation has no another-response link, a recent script submission marker allows a return to the same blank form.

If confirmation is delayed, entries stay in the form. Check the response log before using the recovery unlock inside Help, as retrying an already recorded response could create a duplicate.

The script runs only on the viewform and formResponse pages for these two forms, including their account-specific equivalents. Metadata restrictions are backed by an exact runtime check of the origin, form ID, and path. Frames and other forms are excluded.

- [Testing form](https://docs.google.com/forms/d/e/1FAIpQLSd94LsYIN9i-eKTIYvKjdgk4O03nX7XCJ6Q7W95Vz5AGBFT1Q/viewform)
- [Actual form](https://docs.google.com/forms/d/e/1FAIpQLSegFVvJorGm_Du-TgjGFPJJe_0xSw9Jva17NT6-cleoM4z3FQ/viewform)

No external libraries or privileged Tampermonkey grants are needed. The script makes no network calls of its own. Only a per-form submission timestamp is stored; Google Forms manages the response data.

Run `npm ci`, then `npm test` for local Chromium tests. If Chromium is missing, run `npx playwright install chromium`. Tests simulate Google Forms and confirmation navigation without sending responses. Earlier live checks verified filling both forms and locally intercepted the native submission payload; real server confirmation and a physical Windows scanner still need an end-to-end check with authorized test records.
