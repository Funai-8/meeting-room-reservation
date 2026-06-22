from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Room, Reservation

class ReservationAPITests(APITestCase):

    def setUp(self):
        # We define a common list url
        self.list_url = reverse('reservation-list')

    def test_valid_reservation_succeeds(self):
        room = Room.objects.create(name="Room A", capacity=10)
        data = {
            "room": room.id,
            "name": "Jane Doe",
            "date": "2026-06-22",
            "startTime": "14:00",
            "endTime": "15:00",
            "attendees": 5
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reservation.objects.count(), 1)
        
        # Verify the returned content
        res = Reservation.objects.first()
        self.assertEqual(res.name, "Jane Doe")
        self.assertEqual(res.attendees, 5)
        self.assertEqual(str(res.start_time), "14:00:00")
        self.assertEqual(str(res.end_time), "15:00:00")

    def test_reservation_rejected_when_overcapacity(self):
        room = Room.objects.create(name="Room C", capacity=5)
        data = {
            "room": room.id,
            "name": "Big Meeting",
            "date": "2026-06-22",
            "startTime": "10:00",
            "endTime": "11:00",
            "attendees": 6  # capacity is 5
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Reservation.objects.count(), 0)
        self.assertIn("only fits 5 people", str(response.data))

    def test_reservation_rejected_when_time_overlaps(self):
        room = Room.objects.create(name="Room A", capacity=10)
        
        # Existing booking: 14:00 to 15:00
        Reservation.objects.create(
            room=room,
            name="Alice",
            date="2026-06-22",
            start_time="14:00",
            end_time="15:00",
            attendees=3
        )

        # Overlapping booking case: 14:30 to 15:30
        data = {
            "room": room.id,
            "name": "Bob",
            "date": "2026-06-22",
            "startTime": "14:30",
            "endTime": "15:30",
            "attendees": 3
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Reservation.objects.count(), 1)
        self.assertIn("already booked during that time", str(response.data))

    def test_back_to_back_reservations_succeed(self):
        room = Room.objects.create(name="Room A", capacity=10)
        
        # Existing booking: 14:00 to 15:00
        Reservation.objects.create(
            room=room,
            name="Alice",
            date="2026-06-22",
            start_time="14:00",
            end_time="15:00",
            attendees=3
        )

        # New booking starts exactly when existing ends: 15:00 to 16:00
        data_after = {
            "room": room.id,
            "name": "Bob",
            "date": "2026-06-22",
            "startTime": "15:00",
            "endTime": "16:00",
            "attendees": 3
        }
        response = self.client.post(self.list_url, data_after, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # New booking ends exactly when existing starts: 13:00 to 14:00
        data_before = {
            "room": room.id,
            "name": "Charlie",
            "date": "2026-06-22",
            "startTime": "13:00",
            "endTime": "14:00",
            "attendees": 3
        }
        response2 = self.client.post(self.list_url, data_before, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        
        self.assertEqual(Reservation.objects.count(), 3)

    def test_reservation_different_room_or_date_with_same_time_succeeds(self):
        room_a = Room.objects.create(name="Room A", capacity=10)
        room_b = Room.objects.create(name="Room B", capacity=20)
        
        # Existing booking on Room A, on 2026-06-22, from 14:00 to 15:00
        Reservation.objects.create(
            room=room_a,
            name="Alice",
            date="2026-06-22",
            start_time="14:00",
            end_time="15:00",
            attendees=3
        )

        # Same time and date, but DIFFERENT room (Room B) -> should succeed
        data_diff_room = {
            "room": room_b.id,
            "name": "Bob",
            "date": "2026-06-22",
            "startTime": "14:00",
            "endTime": "15:00",
            "attendees": 4
        }
        response = self.client.post(self.list_url, data_diff_room, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Same time and room, but DIFFERENT date (2026-06-23) -> should succeed
        data_diff_date = {
            "room": room_a.id,
            "name": "Charlie",
            "date": "2026-06-23",
            "startTime": "14:00",
            "endTime": "15:00",
            "attendees": 4
        }
        response2 = self.client.post(self.list_url, data_diff_date, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Reservation.objects.count(), 3)

    def test_cancel_removes_reservation(self):
        room = Room.objects.create(name="Room A", capacity=10)
        res = Reservation.objects.create(
            room=room,
            name="Alice",
            date="2026-06-22",
            start_time="14:00",
            end_time="15:00",
            attendees=3
        )

        # Confirm it appears in the reservation list
        response = self.client.get(self.list_url)
        self.assertEqual(len(response.data), 1)

        # Send delete request
        detail_url = reverse('reservation-detail', kwargs={'pk': res.id})
        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        # Confirm it is removed from list
        list_response = self.client.get(self.list_url)
        self.assertEqual(len(list_response.data), 0)
        self.assertEqual(Reservation.objects.count(), 0)
