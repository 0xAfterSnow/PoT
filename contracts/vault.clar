;; PoT - Bitcoin-Native Trust Layer
;; vault.clar - Locked fund management layer

;; Error constants
(define-constant ERR-UNAUTHORIZED (err u300))
(define-constant ERR-VAULT-NOT-FOUND (err u301))
(define-constant ERR-ALREADY-LOCKED (err u302))
(define-constant ERR-NOT-LOCKED (err u303))
(define-constant ERR-INSUFFICIENT-FUNDS (err u304))

;; Only trust-core can interact with vault
(define-constant TRUST-CORE-CONTRACT .trust-core)

;; Track locked funds per agreement per party
(define-map vault-entries
  {
    agreement-id: uint,
    party: principal,
  }
  {
    amount: uint,
    locked: bool,
    released: bool,
  }
)

;; Read-only functions

(define-read-only (get-vault-entry
    (agreement-id uint)
    (party principal)
  )
  (map-get? vault-entries {
    agreement-id: agreement-id,
    party: party,
  })
)

(define-read-only (is-locked
    (agreement-id uint)
    (party principal)
  )
  (match (map-get? vault-entries {
    agreement-id: agreement-id,
    party: party,
  })
    entry (get locked entry)
    false
  )
)

(define-read-only (get-locked-amount
    (agreement-id uint)
    (party principal)
  )
  (match (map-get? vault-entries {
    agreement-id: agreement-id,
    party: party,
  })
    entry (get amount entry)
    u0
  )
)

;; Public functions

;; Called by trust-core when a party stakes funds for an agreement.
;; Pulls STX from tx-sender (the staking party) into this contract.
(define-public (deposit-stake
    (agreement-id uint)
    (amount uint)
  )
  (begin
    (asserts! (is-eq contract-caller TRUST-CORE-CONTRACT) ERR-UNAUTHORIZED)
    (asserts!
      (is-none (map-get? vault-entries {
        agreement-id: agreement-id,
        party: tx-sender,
      }))
      ERR-ALREADY-LOCKED
    )
    (asserts! (> amount u0) ERR-INSUFFICIENT-FUNDS)

    ;; Pull STX from the staking party into this contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    (map-set vault-entries {
      agreement-id: agreement-id,
      party: tx-sender,
    } {
      amount: amount,
      locked: true,
      released: false,
    })

    (ok true)
  )
)

;; Called by trust-core to release a party's staked funds to a recipient.
(define-public (release-funds
    (agreement-id uint)
    (party principal)
    (recipient principal)
  )
  (let (
      (entry (unwrap!
        (map-get? vault-entries {
          agreement-id: agreement-id,
          party: party,
        })
        ERR-VAULT-NOT-FOUND
      ))
      (vault-principal (as-contract tx-sender))
    )
    (asserts! (is-eq contract-caller TRUST-CORE-CONTRACT) ERR-UNAUTHORIZED)
    (asserts! (get locked entry) ERR-NOT-LOCKED)
    (asserts! (not (get released entry)) ERR-NOT-LOCKED)

    ;; Transfer STX out of this contract to the recipient
    (try! (stx-transfer? (get amount entry) vault-principal recipient))

    (map-set vault-entries {
      agreement-id: agreement-id,
      party: party,
    }
      (merge entry {
        released: true,
        locked: false,
      })
    )

    (ok (get amount entry))
  )
)
