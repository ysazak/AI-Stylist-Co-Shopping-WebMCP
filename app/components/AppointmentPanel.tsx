"use client";
import {
  Appointment,
  appointmentDates,
  slotsFor,
  stores,
  Workspace,
} from "../workspace";

type Props = {
  appointment: Appointment;
  human: (action: string, recipe: (current: Workspace) => Workspace) => void;
};

export function AppointmentPanel({ appointment, human }: Props) {
  return (
    <section className="appointment">
      <div className="appointmenthead">
        <div>
          <p className="eyebrow">IN-STORE FITTING</p>
          <h3>Reserve a fitting.</h3>
        </div>
        {appointment.confirmed && <b>CONFIRMED</b>}
      </div>
      <div className="bookingstep">
        <label>
          01 / Store
          <select
            value={appointment.storeId}
            onChange={(e) =>
              human(
                `Human selected ${stores.find((store) => store.id === e.target.value)?.name ?? "a store"}`,
                (c) => ({
                  ...c,
                  appointment: {
                    ...c.appointment,
                    storeId: e.target.value,
                    date: "",
                    time: "",
                    confirmed: false,
                  },
                }),
              )
            }
          >
            <option value="">Choose a store</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} · {store.city}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="bookingstep">
        <label>
          02 / Date
          <div className="datepills">
            {appointmentDates.map((date) => (
              <button
                key={date.value}
                disabled={!appointment.storeId}
                className={appointment.date === date.value ? "selected" : ""}
                onClick={() =>
                  human(`Human selected fitting date ${date.label}`, (c) => ({
                    ...c,
                    appointment: {
                      ...c.appointment,
                      date: date.value,
                      time: "",
                      confirmed: false,
                    },
                  }))
                }
              >
                {date.label}
              </button>
            ))}
          </div>
        </label>
        {appointment.date && (
          <div className="timepills">
            {slotsFor(appointment.storeId, appointment.date).map((time) => (
              <button
                key={time}
                className={appointment.time === time ? "selected" : ""}
                onClick={() =>
                  human(`Human selected fitting time ${time}`, (c) => ({
                    ...c,
                    appointment: { ...c.appointment, time, confirmed: false },
                  }))
                }
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="bookingstep contactform">
        <p>03 / Contact details</p>
        <input
          aria-label="First name"
          placeholder="First name"
          value={appointment.contact.name}
          onChange={(e) =>
            human("Human entered first name", (c) => ({
              ...c,
              appointment: {
                ...c.appointment,
                contact: { ...c.appointment.contact, name: e.target.value },
                confirmed: false,
              },
            }))
          }
        />
        <input
          aria-label="Surname"
          placeholder="Surname"
          value={appointment.contact.surname}
          onChange={(e) =>
            human("Human entered surname", (c) => ({
              ...c,
              appointment: {
                ...c.appointment,
                contact: { ...c.appointment.contact, surname: e.target.value },
                confirmed: false,
              },
            }))
          }
        />
        <input
          aria-label="Phone number"
          placeholder="Phone number"
          value={appointment.contact.phone}
          onChange={(e) =>
            human("Human entered phone number", (c) => ({
              ...c,
              appointment: {
                ...c.appointment,
                contact: { ...c.appointment.contact, phone: e.target.value },
                confirmed: false,
              },
            }))
          }
        />
        <input
          aria-label="Email address"
          placeholder="Email address"
          type="email"
          value={appointment.contact.email}
          onChange={(e) =>
            human("Human entered email", (c) => ({
              ...c,
              appointment: {
                ...c.appointment,
                contact: { ...c.appointment.contact, email: e.target.value },
                confirmed: false,
              },
            }))
          }
        />
        <textarea
          aria-label="Appointment note"
          placeholder="A note for your stylist (optional)"
          value={appointment.note}
          onChange={(e) =>
            human("Human added fitting note", (c) => ({
              ...c,
              appointment: {
                ...c.appointment,
                note: e.target.value,
                confirmed: false,
              },
            }))
          }
        />
      </div>
      <button
        className="confirmappointment"
        disabled={
          !appointment.storeId ||
          !appointment.date ||
          !appointment.time ||
          !appointment.contact.name ||
          !appointment.contact.surname ||
          !appointment.contact.phone ||
          !/^\S+@\S+\.\S+$/.test(appointment.contact.email)
        }
        onClick={() =>
          human("Human confirmed fitting appointment", (c) => ({
            ...c,
            appointment: { ...c.appointment, confirmed: true },
          }))
        }
      >
        {appointment.confirmed ? "Appointment reserved" : "Reserve my fitting"}
      </button>
      {appointment.confirmed && (
        <p className="appointmentsummary">
          {stores.find((store) => store.id === appointment.storeId)?.name} ·{" "}
          {
            appointmentDates.find((date) => date.value === appointment.date)
              ?.label
          }{" "}
          at {appointment.time}
        </p>
      )}
    </section>
  );
}
