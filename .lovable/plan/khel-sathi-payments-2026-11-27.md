# Khel Sathi payments

## Goal
Remove the ₹10 per-person platform fee while keeping the existing Sports Connect experience intact, and add genuine online payments.

## Changes
- Remove the platform fee from payment totals and fee displays for new bookings and matches; leave existing saved bookings and payment records unchanged.
- Add a real checkout and mark payments complete only after the payment provider verifies them. The recipient choice determines the correct payment setup, so hold provider-specific work until that is confirmed.
- Preserve the current booking, match, chat, account, and venue features.

## Verification
- Check fee-free totals in booking and match payment views.
- Exercise payment confirmation and failure states with the provider's test environment before enabling live charges.

## Setup boundary
Real payment activation requires the recipient choice, provider eligibility, and the provider setup confirmation. Do not present demo payments as real charges.