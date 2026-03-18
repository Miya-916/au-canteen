# AU Canteen Final Defense Test Sheet

## Test Run Info

| Field | Value |
|---|---|
| Tester | |
| Date | |
| Build/Commit | |
| Environment | Local / Staging / Production |
| Browser | Chrome / Safari / Edge |

## Result Legend

- PASS = Works as expected
- FAIL = Not working or wrong behavior
- BLOCKED = Cannot test due to dependency issue

---

## A) Authentication & Access

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| AUTH-01 | Register | Register with valid email/password | Account created, verify email prompt shown | | |
| AUTH-02 | Register | Register with existing email | Clear duplicate-email error | | |
| AUTH-03 | Verify Email | Open verification link first time | Account verified successfully | | |
| AUTH-04 | Verify Email | Reuse same verification link | Link rejected or already-used message | | |
| AUTH-05 | Login | Login before email verification | Login blocked with proper message | | |
| AUTH-06 | Login | Login after verification | Redirect to correct dashboard by role | | |
| AUTH-07 | Forgot Password | Submit valid email | Reset email sent success message | | |
| AUTH-08 | Reset Password | Use valid reset link and new password | Password updated and can login | | |
| AUTH-09 | Reset Password | Reuse reset link | Link/token invalid after first use | | |
| AUTH-10 | Logout | Logout from each role | Session cleared and redirected | | |
| AUTH-11 | Access Control | User tries /owner page | Access denied/redirect | | |
| AUTH-12 | Access Control | Owner tries /admin page | Access denied/redirect | | |

---

## B) User Shopping & Order Placement

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| USER-01 | Shop List | Open user home and browse shops | Shops load correctly | | |
| USER-02 | Shop Menu | Open one shop menu | Items, prices, categories display | | |
| USER-03 | Cart | Add one item to cart | Cart quantity and total update | | |
| USER-04 | Cart | Increase/decrease item quantity | Total recalculates correctly | | |
| USER-05 | Cart | Remove item from cart | Item removed and total updated | | |
| USER-06 | Pickup Slot | Open slot selector | Slot list loads with capacity indicators | | |
| USER-07 | Pickup Slot | Select a valid slot range | Selected value shows as range | | |
| USER-08 | Pickup Slot | Try selecting past slot | Past slot is disabled | | |
| USER-09 | Place Order | Place order with valid cart + slot | Order created and navigates to payment | | |
| USER-10 | Validation | Try place order with empty cart | Action blocked with clear feedback | | |

---

## C) Payment Flow

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| PAY-01 | Payment Page | Open payment after placing order | Order summary shows correct items and total | | |
| PAY-02 | Pickup Display | Check pickup on payment page | Pickup shown as time range (not single time) | | |
| PAY-03 | Notice | Check accidental-order reassurance notice | Notice appears below payment summary and above QR area | | |
| PAY-04 | Status | Pending order before acceptance | “Waiting for shop to accept...” shown | | |
| PAY-05 | QR | Accepted order before pickup time | QR shown and payment actions enabled | | |
| PAY-06 | Upload | Upload valid receipt image | Upload succeeds and preview/state updates | | |
| PAY-07 | Upload Validation | Upload invalid file type | Rejected with proper error/blocked behavior | | |
| PAY-08 | Send Receipt | Send receipt after upload | Success and redirect to orders | | |
| PAY-09 | Expiry Rule | Attempt payment after pickup time | Blocked with payment closed/expired message | | |
| PAY-10 | Expired Message | Unpaid overdue order | Status shows expired reason | | |

---

## D) User Orders & Tracking

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| ORD-01 | Active Orders | Open user orders page | Current orders load with status badges | | |
| ORD-02 | Pickup Display | Check pickup label in orders | Pickup shown as range | | |
| ORD-03 | Status Progress | Move order through statuses | Timeline/progress updates correctly | | |
| ORD-04 | Completed History | Complete an order | Moves from active to history | | |
| ORD-05 | Cancelled/Expired | Cancelled or expired order | Displayed with correct status text | | |

---

## E) Owner Dashboard Operations

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| OWN-01 | New Orders | New user order appears in owner dashboard | Order card visible in New Orders | | |
| OWN-02 | Pickup Display | Check pickup in New Orders card | Pickup shown as time range | | |
| OWN-03 | Accept | Click Accept Order | Status changes to accepted | | |
| OWN-04 | Reject | Reject pending order | Status changes to cancelled/rejected | | |
| OWN-05 | Receipt Gate | Accepted order without receipt | Verify/Prepare stays blocked if designed so | | |
| OWN-06 | Verify & Prepare | Accepted order with receipt | Moves to Preparing | | |
| OWN-07 | Mark Ready | Click Mark Ready | Moves to Ready for Pickup | | |
| OWN-08 | Confirm Pickup | Click Confirm Pickup | Moves to Completed | | |
| OWN-09 | Pickup Range | Check pickup in Preparing/Ready/Completed | Range shown in all columns | | |
| OWN-10 | Expired Visibility | Expired unpaid orders on owner board | Not shown in active processing columns | | |

---

## F) Admin Flows

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| ADM-01 | Admin Login | Login as admin | Admin dashboard loads | | |
| ADM-02 | Pending Requests | Open pending approvals | Records load correctly | | |
| ADM-03 | Approve | Approve pending shop/owner request | Status updates and reflects in relevant views | | |
| ADM-04 | Reject | Reject pending request | Status updates with clear reason/state | | |
| ADM-05 | Shop Management | Create or edit shop | Saved values visible in list/detail | | |
| ADM-06 | Owner Management | Open owners page and verify data | Owner list/actions work | | |
| ADM-07 | Announcements | Create and publish announcement | Visible to target role pages | | |
| ADM-08 | Settings | Update system settings | New settings persist after refresh | | |

---

## G) API & Security Checks

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| API-01 | Unauthorized API | Call protected API without auth | 401/403 returned | | |
| API-02 | Role Abuse | User calls owner/admin update endpoints | Rejected by backend | | |
| API-03 | Invalid Transition | Force invalid order status transition | Backend rejects with proper error | | |
| API-04 | Input Tampering | Modify order/shop IDs in request | Access blocked or validation fails | | |
| API-05 | Upload Security | Upload suspicious/non-image content | Rejected or sanitized | | |

---

## H) Data, Time, and Edge Cases

| ID | Area | Test Case | Expected Result | Result | Notes/Evidence |
|---|---|---|---|---|---|
| EDGE-01 | Timezone | Compare pickup time across user/owner | Same Bangkok time logic shown | | |
| EDGE-02 | Slot Capacity | Fill slot near limit with multiple users | Capacity enforced, over-limit blocked | | |
| EDGE-03 | Double Click | Click important actions repeatedly fast | No duplicate records/transitions | | |
| EDGE-04 | Refresh Recovery | Refresh during payment/order pages | Data reloads safely without corruption | | |
| EDGE-05 | Polling Sync | Keep owner + user pages open | Status updates propagate correctly | | |

---

## I) Final Technical Gate

| ID | Command/Check | Expected Result | Result | Notes |
|---|---|---|---|---|
| FINAL-01 | `npx tsc --noEmit` | Pass (0 exit) | | |
| FINAL-02 | `npm run lint` | No new issues introduced by final changes | | |
| FINAL-03 | Build/Run smoke test | App starts and key pages load | | |
| FINAL-04 | Demo script run-through | No blocking issue in complete scenario | | |

---

## Defense Evidence Checklist

| Evidence ID | Screenshot/Video Needed | Captured (Y/N) | File Name |
|---|---|---|---|
| EV-01 | Register + verify email success | | |
| EV-02 | Place order with pickup range | | |
| EV-03 | Payment page with pickup range + notice | | |
| EV-04 | Owner accepts and prepares order | | |
| EV-05 | Owner marks ready and completed | | |
| EV-06 | Expired unpaid order behavior | | |
| EV-07 | Admin approval/pending flow | | |
| EV-08 | Final pass summary (commands + key screens) | | |

