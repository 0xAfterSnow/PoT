;; PoT - Bitcoin-Native Trust Layer
;; reputation.clar - On-chain reputation tracking

;; Error constants
(define-constant ERR-UNAUTHORIZED (err u200))

;; Only trust-core contract can call update functions
(define-constant TRUST-CORE-CONTRACT .trust-core)

;; Data map
(define-map reputation
  { user: principal }
  {
    total-agreements: uint,
    successful-agreements: uint,
    failed-agreements: uint,
    disputes-won: uint,
    disputes-lost: uint,
    score: int,
  }
)

;; Read-only functions

(define-read-only (get-reputation (user principal))
  (default-to {
    total-agreements: u0,
    successful-agreements: u0,
    failed-agreements: u0,
    disputes-won: u0,
    disputes-lost: u0,
    score: 0,
  }
    (map-get? reputation { user: user })
  )
)

(define-read-only (get-score (user principal))
  (get score (get-reputation user))
)

(define-read-only (calculate-score
    (successful uint)
    (failed uint)
    (disputes-won uint)
  )
  ;; score = (successful * 10) - (failed * 15) + (disputes_won * 5)
  (- (+ (* (to-int successful) 10) (* (to-int disputes-won) 5))
    (* (to-int failed) 15)
  )
)

;; Internal update helper
(define-private (update-rep
    (user principal)
    (delta-total int)
    (delta-success int)
    (delta-fail int)
    (delta-dw int)
    (delta-dl int)
  )
  (let (
      (current (get-reputation user))
      (new-success (+ (get successful-agreements current)
        (if (> delta-success 0)
          (to-uint delta-success)
          u0
        )))
      (new-failed (+ (get failed-agreements current)
        (if (> delta-fail 0)
          (to-uint delta-fail)
          u0
        )))
      (new-dw (+ (get disputes-won current)
        (if (> delta-dw 0)
          (to-uint delta-dw)
          u0
        )))
      (new-dl (+ (get disputes-lost current)
        (if (> delta-dl 0)
          (to-uint delta-dl)
          u0
        )))
      (new-total (+ (get total-agreements current)
        (if (> delta-total 0)
          (to-uint delta-total)
          u0
        )))
      (new-score (calculate-score new-success new-failed new-dw))
    )
    (map-set reputation { user: user } {
      total-agreements: new-total,
      successful-agreements: new-success,
      failed-agreements: new-failed,
      disputes-won: new-dw,
      disputes-lost: new-dl,
      score: new-score,
    })
    (ok true)
  )
)

;; Public functions - only callable from trust-core

(define-public (record-agreement-created (user principal))
  (begin
    (asserts! (is-eq contract-caller TRUST-CORE-CONTRACT) ERR-UNAUTHORIZED)
    (update-rep user 1 0 0 0 0)
  )
)

(define-public (record-success (user principal))
  (begin
    (asserts! (is-eq contract-caller TRUST-CORE-CONTRACT) ERR-UNAUTHORIZED)
    (update-rep user 0 1 0 0 0)
  )
)

(define-public (record-failure (user principal))
  (begin
    (asserts! (is-eq contract-caller TRUST-CORE-CONTRACT) ERR-UNAUTHORIZED)
    (update-rep user 0 0 1 0 0)
  )
)

(define-public (record-dispute-win (user principal))
  (begin
    (asserts! (is-eq contract-caller TRUST-CORE-CONTRACT) ERR-UNAUTHORIZED)
    (update-rep user 0 0 0 1 0)
  )
)

(define-public (record-dispute-loss (user principal))
  (begin
    (asserts! (is-eq contract-caller TRUST-CORE-CONTRACT) ERR-UNAUTHORIZED)
    (update-rep user 0 0 0 0 1)
  )
)
