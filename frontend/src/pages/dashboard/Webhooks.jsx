import LaterStub from '../../components/LaterStub'

export default function Webhooks() {
  return (
    <LaterStub
      eyebrow="DASHBOARD · WEBHOOKS"
      title="Delivery logs."
      description="Register an endpoint and TRUST will push every verdict to it as it's decided. Not built for the hackathon deadline — the endpoint contract exists on the backend already, delivery and retry logic doesn't."
      plannedRoutes={['POST /v1/webhooks — register a delivery endpoint', 'GET /v1/webhooks/{id}/deliveries — delivery logs']}
    />
  )
}
