;; PoT - Bitcoin-Native Trust Layer
;; trust-core.clar - Core agreement lifecycle management

;; Error constants
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-AGREEMENT-NOT-FOUND (err u101))
(define-constant ERR-INVALID-STATUS (err u102))
(define-constant ERR-ALREADY-ACCEPTED (err u103))
(define-constant ERR-ALREADY-RESOLVED (err u104))
(define-constant ERR-INVALID-STAKE (err u105))
(define-constant ERR-DEADLINE-PASSED (err u106))
(define-constant ERR-NOT-PARTY (err u107))
(define-constant ERR-SAME-PARTY (err u108))
(define-constant ERR-ALREADY-STAKED (err u109))
(define-constant ERR-NOT-ACTIVE (err u110))
(define-constant ERR-NO-RESOLVER (err u111))
(define-constant ERR-DISPUTE-NOT-RAISED (err u112))
(define-constant ERR-REPLAY-GUARD (err u113))

;; Status constants (uint encoded)
;; 0 = PENDING
;; 1 = ACTIVE
;; 2 = COMPLETED
;; 3 = FAILED
;; 4 = DISPUTED
;; 5 = RESOLVED

(define-constant STATUS-PENDING u0)
(define-constant STATUS-ACTIVE u1)
(define-constant STATUS-COMPLETED u2)
(define-constant STATUS-FAILED u3)
(define-constant STATUS-DISPUTED u4)
(define-constant STATUS-RESOLVED u5)

(define-constant MIN-STAKE u1000000) ;; 1 STX minimum

;; Data maps
(define-map agreements
  { id: uint }
  {
    party-a: principal,
    party-b: principal,
    title: (string-utf8 100),
    description: (string-utf8 500),
    stake: uint,
    deadline: uint,
    status: uint,
    resolver: (optional principal),
    party-a-staked: bool,
    party-b-staked: bool,
    created-at: uint,
    resolved-at: (optional uint),
  }
)

;; Replay guard: tracks resolved agreements to prevent double resolution
(define-map resolution-guard
  { id: uint }
  { resolved: bool }
)

;; Data variable
(define-data-var agreement-counter uint u0)

;; Read-only functions

(define-read-only (get-agreement (id uint))
  (map-get? agreements { id: id })
)

(define-read-only (get-agreement-count)
  (var-get agreement-counter)
)

(define-read-only (get-status-label (status uint))
  (if (is-eq status STATUS-PENDING)
    "PENDING"
    (if (is-eq status STATUS-ACTIVE)
      "ACTIVE"
      (if (is-eq status STATUS-COMPLETED)
        "COMPLETED"
        (if (is-eq status STATUS-FAILED)
          "FAILED"
          (if (is-eq status STATUS-DISPUTED)
            "DISPUTED"
            (if (is-eq status STATUS-RESOLVED)
              "RESOLVED"
              "UNKNOWN"
            )
          )
        )
      )
    )
  )
)

(define-read-only (is-party
    (id uint)
    (user principal)
  )
  (match (map-get? agreements { id: id })
    agreement (or
      (is-eq user (get party-a agreement))
      (is-eq user (get party-b agreement))
    )
    false
  )
)

;; Public functions

(define-public (create-agreement
    (title (string-utf8 100))
    (description (string-utf8 500))
    (party-b principal)
    (stake uint)
    (deadline uint)
    (resolver (optional principal))
  )
  (let ((id (+ (var-get agreement-counter) u1)))
    ;; Validations
    (asserts! (> (len title) u0) ERR-INVALID-STAKE)
    (asserts! (not (is-eq tx-sender party-b)) ERR-SAME-PARTY)
    (asserts! (>= stake MIN-STAKE) ERR-INVALID-STAKE)
    (asserts! (> deadline stacks-block-height) ERR-DEADLINE-PASSED)

    ;; Store agreement
    (map-set agreements { id: id } {
      party-a: tx-sender,
      party-b: party-b,
      title: title,
      description: description,
      stake: stake,
      deadline: deadline,
      status: STATUS-PENDING,
      resolver: resolver,
      party-a-staked: false,
      party-b-staked: false,
      created-at: stacks-block-height,
      resolved-at: none,
    })

    (var-set agreement-counter id)

    ;; Update reputation contract
    (try! (contract-call? .reputation record-agreement-created tx-sender))

    (ok id)
  )
)

(define-public (accept-agreement (id uint))
  (let ((agreement (unwrap! (map-get? agreements { id: id }) ERR-AGREEMENT-NOT-FOUND)))
    ;; Only party B can accept
    (asserts! (is-eq tx-sender (get party-b agreement)) ERR-UNAUTHORIZED)
    ;; Must be PENDING
    (asserts! (is-eq (get status agreement) STATUS-PENDING) ERR-INVALID-STATUS)
    ;; Deadline not passed
    (asserts! (< stacks-block-height (get deadline agreement))
      ERR-DEADLINE-PASSED
    )

    ;; Update status to ACTIVE
    (map-set agreements { id: id } (merge agreement { status: STATUS-ACTIVE }))

    (ok true)
  )
)

(define-public (stake-funds (id uint))
  (let (
      (agreement (unwrap! (map-get? agreements { id: id }) ERR-AGREEMENT-NOT-FOUND))
      (stake-amount (get stake agreement))
      (is-party-a (is-eq tx-sender (get party-a agreement)))
      (is-party-b (is-eq tx-sender (get party-b agreement)))
    )
    ;; Must be a party
    (asserts! (or is-party-a is-party-b) ERR-NOT-PARTY)
    ;; Must be ACTIVE
    (asserts! (is-eq (get status agreement) STATUS-ACTIVE) ERR-NOT-ACTIVE)
    ;; Deadline not passed
    (asserts! (< stacks-block-height (get deadline agreement))
      ERR-DEADLINE-PASSED
    )
    ;; Not already staked
    (asserts!
      (if is-party-a
        (not (get party-a-staked agreement))
        (not (get party-b-staked agreement))
      )
      ERR-ALREADY-STAKED
    )

    ;; Transfer stake to contract
    (try! (stx-transfer? stake-amount tx-sender (as-contract tx-sender)))

    ;; Update staking flags
    (map-set agreements { id: id }
      (merge agreement {
        party-a-staked: (if is-party-a
          true
          (get party-a-staked agreement)
        ),
        party-b-staked: (if is-party-b
          true
          (get party-b-staked agreement)
        ),
      })
    )

    (ok true)
  )
)

(define-public (resolve-success (id uint))
  (let (
      (agreement (unwrap! (map-get? agreements { id: id }) ERR-AGREEMENT-NOT-FOUND))
      (stake-amount (get stake agreement))
      (party-a (get party-a agreement))
      (party-b (get party-b agreement))
    )
    ;; Only parties can call resolve-success
    (asserts! (or (is-eq tx-sender party-a) (is-eq tx-sender party-b))
      ERR-NOT-PARTY
    )
    ;; Must be ACTIVE
    (asserts! (is-eq (get status agreement) STATUS-ACTIVE) ERR-NOT-ACTIVE)
    ;; Replay guard
    (asserts! (is-none (map-get? resolution-guard { id: id })) ERR-REPLAY-GUARD)

    ;; Return stakes to both parties (if staked)
    (if (get party-a-staked agreement)
      (try! (as-contract (stx-transfer? stake-amount tx-sender party-a)))
      true
    )
    (if (get party-b-staked agreement)
      (try! (as-contract (stx-transfer? stake-amount tx-sender party-b)))
      true
    )

    ;; Set resolution guard
    (map-set resolution-guard { id: id } { resolved: true })

    ;; Update status
    (map-set agreements { id: id }
      (merge agreement {
        status: STATUS-COMPLETED,
        resolved-at: (some stacks-block-height),
      })
    )

    ;; Update reputation
    (try! (contract-call? .reputation record-success party-a))
    (try! (contract-call? .reputation record-success party-b))

    (ok true)
  )
)

(define-public (resolve-failure (id uint))
  (let (
      (agreement (unwrap! (map-get? agreements { id: id }) ERR-AGREEMENT-NOT-FOUND))
      (stake-amount (get stake agreement))
      (party-a (get party-a agreement))
      (party-b (get party-b agreement))
    )
    ;; Only parties can call resolve-failure
    (asserts! (or (is-eq tx-sender party-a) (is-eq tx-sender party-b))
      ERR-NOT-PARTY
    )
    ;; Must be ACTIVE
    (asserts! (is-eq (get status agreement) STATUS-ACTIVE) ERR-NOT-ACTIVE)
    ;; Replay guard
    (asserts! (is-none (map-get? resolution-guard { id: id })) ERR-REPLAY-GUARD)

    ;; Slash stake to counterparty
    (let (
        (caller-is-a (is-eq tx-sender party-a))
        (counterparty (if caller-is-a
          party-b
          party-a
        ))
        (caller-staked (if caller-is-a
          (get party-a-staked agreement)
          (get party-b-staked agreement)
        ))
        (counter-staked (if caller-is-a
          (get party-b-staked agreement)
          (get party-a-staked agreement)
        ))
      )
      ;; Slash caller's stake to counterparty
      (if caller-staked
        (try! (as-contract (stx-transfer? stake-amount tx-sender counterparty)))
        true
      )
      ;; Return counterparty's stake if staked
      (if counter-staked
        (try! (as-contract (stx-transfer? stake-amount tx-sender counterparty)))
        true
      )
    )

    ;; Set resolution guard
    (map-set resolution-guard { id: id } { resolved: true })

    ;; Update status
    (map-set agreements { id: id }
      (merge agreement {
        status: STATUS-FAILED,
        resolved-at: (some stacks-block-height),
      })
    )

    ;; Update reputation
    (let (
        (caller-is-a (is-eq tx-sender party-a))
        (failing-party tx-sender)
        (winning-party (if caller-is-a
          party-b
          party-a
        ))
      )
      (try! (contract-call? .reputation record-failure failing-party))
      (try! (contract-call? .reputation record-success winning-party))
    )

    (ok true)
  )
)

(define-public (raise-dispute (id uint))
  (let ((agreement (unwrap! (map-get? agreements { id: id }) ERR-AGREEMENT-NOT-FOUND)))
    ;; Must be a party
    (asserts! (is-party id tx-sender) ERR-NOT-PARTY)
    ;; Must be ACTIVE
    (asserts! (is-eq (get status agreement) STATUS-ACTIVE) ERR-NOT-ACTIVE)
    ;; Must have a resolver
    (asserts! (is-some (get resolver agreement)) ERR-NO-RESOLVER)
    ;; Replay guard
    (asserts! (is-none (map-get? resolution-guard { id: id })) ERR-REPLAY-GUARD)

    ;; Update status to DISPUTED
    (map-set agreements { id: id } (merge agreement { status: STATUS-DISPUTED }))

    (ok true)
  )
)

(define-public (resolve-dispute
    (id uint)
    (winner principal)
  )
  (let (
      (agreement (unwrap! (map-get? agreements { id: id }) ERR-AGREEMENT-NOT-FOUND))
      (party-a (get party-a agreement))
      (party-b (get party-b agreement))
      (stake-amount (get stake agreement))
    )
    ;; Only resolver can call this
    (asserts!
      (match (get resolver agreement)
        resolver (is-eq tx-sender resolver)
        false
      )
      ERR-UNAUTHORIZED
    )
    ;; Must be DISPUTED
    (asserts! (is-eq (get status agreement) STATUS-DISPUTED)
      ERR-DISPUTE-NOT-RAISED
    )
    ;; Winner must be a party
    (asserts! (or (is-eq winner party-a) (is-eq winner party-b)) ERR-NOT-PARTY)
    ;; Replay guard
    (asserts! (is-none (map-get? resolution-guard { id: id })) ERR-REPLAY-GUARD)

    (let (
        (loser (if (is-eq winner party-a)
          party-b
          party-a
        ))
        (winner-staked (if (is-eq winner party-a)
          (get party-a-staked agreement)
          (get party-b-staked agreement)
        ))
        (loser-staked (if (is-eq loser party-a)
          (get party-a-staked agreement)
          (get party-b-staked agreement)
        ))
      )
      ;; Return winner's stake + loser's stake to winner
      (if winner-staked
        (try! (as-contract (stx-transfer? stake-amount tx-sender winner)))
        true
      )
      (if loser-staked
        (try! (as-contract (stx-transfer? stake-amount tx-sender winner)))
        true
      )
    )

    ;; Set resolution guard
    (map-set resolution-guard { id: id } { resolved: true })

    ;; Update status
    (map-set agreements { id: id }
      (merge agreement {
        status: STATUS-RESOLVED,
        resolved-at: (some stacks-block-height),
      })
    )

    ;; Update reputation
    (let ((loser (if (is-eq winner party-a)
        party-b
        party-a
      )))
      (try! (contract-call? .reputation record-dispute-win winner))
      (try! (contract-call? .reputation record-dispute-loss loser))
    )

    (ok true)
  )
)
